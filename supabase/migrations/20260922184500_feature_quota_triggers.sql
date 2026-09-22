-- Application des quotas mensuels du plan gratuit, côté base de données.
-- Appliquée en production le 22/09/2026.
--
-- POURQUOI ICI ET PAS DANS LES EDGE FUNCTIONS
-- Le contrôle idéal se ferait dans les edge functions, AVANT l'appel à l'IA.
-- Mais leur redéploiement passe obligatoirement par l'agent Lovable (vérifié :
-- ni un push GitHub ni le bouton Publish ne les redéploient). Les déclencheurs
-- ci-dessous appliquent donc la limite au moment où le résultat est enregistré.
--
-- Conséquence assumée : l'appel à l'IA a déjà eu lieu quand la limite est
-- atteinte, donc son coût est payé une fois par utilisateur et par mois.
-- À remplacer par un contrôle dans les edge functions dès que possible.
--
-- NON COUVERT PAR CE MÉCANISME :
--   - saisie vocale (speech-to-text / parse-voice) : n'écrit rien en base,
--     les transactions créées n'ont pas de colonne indiquant leur origine ;
--   - budget-suggest et budget-coaching-plan : ne persistent pas leurs résultats.
--   Ces trois-là ne seront limitables que depuis les edge functions.

create or replace function public.enforce_feature_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feature text := tg_argv[0];
  v_result jsonb;
begin
  -- Seuls les messages écrits par l'utilisateur comptent (pas les réponses de l'IA).
  -- Le test est imbriqué : le champ message_role n'existe que sur cette table.
  if tg_table_name = 'assistant_messages' then
    if coalesce(new.message_role, '') <> 'user' then
      return new;
    end if;
  end if;

  if public.has_role(new.user_id, 'admin') then
    return new;
  end if;

  v_result := public.consume_feature(new.user_id, v_feature);

  if (v_result->>'allowed')::boolean is not true then
    raise exception 'free_plan_limit_reached: % (limite %/mois)', v_feature, (v_result->>'limit')
      using errcode = 'P0001',
            hint = 'Passe au plan Pro pour continuer ce mois-ci.',
            detail = v_result::text;
  end if;

  return new;
end;
$$;

-- 5 scans de reçus par mois
drop trigger if exists trg_quota_scan on public.receipt_scans;
create trigger trg_quota_scan
  before insert on public.receipt_scans
  for each row execute function public.enforce_feature_quota('scan');

-- 10 messages à l'assistant par mois (les réponses de l'IA ne comptent pas)
drop trigger if exists trg_quota_chat on public.assistant_messages;
create trigger trg_quota_chat
  before insert on public.assistant_messages
  for each row execute function public.enforce_feature_quota('chat');

-- 1 score financier par mois
drop trigger if exists trg_quota_financial_score on public.financial_scores;
create trigger trg_quota_financial_score
  before insert on public.financial_scores
  for each row execute function public.enforce_feature_quota('financial_score');
