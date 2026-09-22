-- Limites du plan gratuit : compteurs mensuels d'usage IA + limites d'objets.
-- Appliquée en production le 22/09/2026.
--
-- Principe : les données existantes ne sont jamais touchées. Seules les
-- nouvelles créations au-delà du quota sont refusées, et uniquement pour les
-- comptes sans abonnement Pro actif (public.has_active_pro).

-- ─────────────────────────────────────────────────────────────
-- 1. Comptage mensuel des usages facturés (IA, scan, voix)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.feature_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  month date not null,
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, month)
);

alter table public.feature_usage enable row level security;

drop policy if exists "Users can view own usage" on public.feature_usage;
create policy "Users can view own usage" on public.feature_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Block client writes on feature_usage" on public.feature_usage;
create policy "Block client writes on feature_usage" on public.feature_usage
  for all to authenticated, anon using (false) with check (false);

grant select on public.feature_usage to authenticated;
grant all on public.feature_usage to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. Source unique des limites du plan gratuit
-- ─────────────────────────────────────────────────────────────
create or replace function public.free_limit(_feature text)
returns integer language sql immutable as $$
  select case _feature
    when 'scan'            then 5
    when 'chat'            then 10
    when 'voice'           then 15
    when 'budget_suggest'  then 2
    when 'budget_plan'     then 1
    when 'financial_score' then 1
    else null
  end;
$$;

comment on function public.free_limit(text) is 'Limites mensuelles du plan gratuit. NULL = fonctionnalité non limitée.';

-- ─────────────────────────────────────────────────────────────
-- 3. Consommation atomique d'un crédit mensuel
--    Appelée par les edge functions (service_role) ou par l'app
--    pour son propre compte uniquement.
-- ─────────────────────────────────────────────────────────────
create or replace function public.consume_feature(_user_id uuid, _feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_limit integer := public.free_limit(_feature);
  v_used integer;
  v_resets timestamptz := (date_trunc('month', now()) + interval '1 month');
begin
  -- Un utilisateur connecté ne peut consommer que pour lui-même
  if auth.uid() is not null and auth.uid() <> _user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Pro actif ou fonctionnalité non limitée : on compte sans jamais bloquer
  if v_limit is null or public.has_active_pro(_user_id) then
    insert into public.feature_usage (user_id, feature, month, used, updated_at)
    values (_user_id, _feature, v_month, 1, now())
    on conflict (user_id, feature, month)
      do update set used = public.feature_usage.used + 1, updated_at = now()
    returning used into v_used;
    return jsonb_build_object('allowed', true, 'unlimited', true, 'used', v_used,
                              'limit', v_limit, 'resets_at', v_resets);
  end if;

  -- Plan gratuit : on n'incrémente que si le quota n'est pas atteint
  insert into public.feature_usage (user_id, feature, month, used, updated_at)
  values (_user_id, _feature, v_month, 1, now())
  on conflict (user_id, feature, month)
    do update set used = public.feature_usage.used + 1, updated_at = now()
    where public.feature_usage.used < v_limit
  returning used into v_used;

  if v_used is null then
    select used into v_used from public.feature_usage
    where user_id = _user_id and feature = _feature and month = v_month;
    return jsonb_build_object('allowed', false, 'unlimited', false,
                              'used', coalesce(v_used, v_limit), 'limit', v_limit,
                              'resets_at', v_resets);
  end if;

  return jsonb_build_object('allowed', true, 'unlimited', false, 'used', v_used,
                            'limit', v_limit, 'resets_at', v_resets);
end;
$$;

revoke all on function public.consume_feature(uuid, text) from public, anon;
grant execute on function public.consume_feature(uuid, text) to service_role, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Lecture des compteurs du mois, pour l'affichage dans l'app
-- ─────────────────────────────────────────────────────────────
create or replace function public.monthly_usage(_user_id uuid default auth.uid())
returns table (feature text, used integer, free_limit integer, unlimited boolean, resets_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> _user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select f.feature,
         coalesce(u.used, 0)::integer,
         public.free_limit(f.feature),
         public.has_active_pro(_user_id),
         (date_trunc('month', now()) + interval '1 month')
  from (values ('scan'), ('chat'), ('voice'), ('budget_suggest'), ('budget_plan'), ('financial_score')) as f(feature)
  left join public.feature_usage u
    on u.user_id = _user_id and u.feature = f.feature
   and u.month = date_trunc('month', now())::date;
end;
$$;

revoke all on function public.monthly_usage(uuid) from public, anon;
grant execute on function public.monthly_usage(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. Limites d'objets du plan gratuit (épargne, tontines, caisses)
--    Vérifiées par la base, pas seulement par l'interface.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_free_object_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
  v_label text;
begin
  if public.has_active_pro(new.user_id) or public.has_role(new.user_id, 'admin') then
    return new;
  end if;

  case tg_table_name
    when 'savings_goals' then v_limit := 1; v_label := 'objectif d''épargne';
    when 'tontines'      then v_limit := 3; v_label := 'tontine';
    when 'caisses'       then v_limit := 1; v_label := 'caisse de projet';
    else return new;
  end case;

  execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
    into v_count using new.user_id;

  if v_count >= v_limit then
    raise exception 'free_plan_limit_reached: % (limite %)', v_label, v_limit
      using errcode = 'P0001',
            hint = 'Passe au plan Pro pour en créer davantage.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_free_limit_savings_goals on public.savings_goals;
create trigger trg_free_limit_savings_goals
  before insert on public.savings_goals
  for each row execute function public.enforce_free_object_limit();

drop trigger if exists trg_free_limit_tontines on public.tontines;
create trigger trg_free_limit_tontines
  before insert on public.tontines
  for each row execute function public.enforce_free_object_limit();

drop trigger if exists trg_free_limit_caisses on public.caisses;
create trigger trg_free_limit_caisses
  before insert on public.caisses
  for each row execute function public.enforce_free_object_limit();
