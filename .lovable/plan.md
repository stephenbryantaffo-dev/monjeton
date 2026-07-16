## Objectif
Lier les membres de tontines aux comptes utilisateurs et empêcher les doublons dans une même caisse.

## Changements DB (migration unique)

1. **Ajouter colonne `user_id`** à `public.tontine_members`
   - Type: `uuid`, nullable (les membres invités par téléphone sans compte restent supportés)
   - Pas de FK vers `auth.users` (règle Lovable Cloud) — juste la colonne uuid

2. **Index unique partiel** sur `(tontine_id, user_id)`
   - Partiel avec `WHERE user_id IS NOT NULL` pour permettre plusieurs membres sans compte
   - Empêche qu'un même `user_id` soit ajouté deux fois à la même caisse

3. **Index secondaire** sur `user_id` seul pour accélérer les lookups "mes caisses via membership"

## SQL prévu

```sql
ALTER TABLE public.tontine_members
  ADD COLUMN user_id uuid;

CREATE UNIQUE INDEX tontine_members_tontine_user_unique
  ON public.tontine_members (tontine_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX tontine_members_user_id_idx
  ON public.tontine_members (user_id);
```

## Hors périmètre
- Pas de backfill automatique de `user_id` depuis `profiles.phone` (à faire séparément si souhaité)
- Pas de changement de RLS ni de code applicatif — l'ajout est rétro-compatible (colonne nullable)
- Les types Supabase seront régénérés après la migration; aucun code à modifier tant qu'on n'utilise pas encore `user_id`

Confirmez pour que je lance la migration.