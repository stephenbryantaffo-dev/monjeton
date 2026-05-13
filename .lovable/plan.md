## Plan

Remplacer le modèle Claude dans deux edge functions :

1. **`supabase/functions/budget-coaching-plan/index.ts`**
   - Ligne ~57 : `model: 'claude-3-5-sonnet-20241022'` → `model: 'claude-haiku-4-5-20251001'`

2. **`supabase/functions/budget-rebalance-suggest/index.ts`**
   - Même remplacement du nom de modèle dans l'appel `fetch` vers `api.anthropic.com`

Aucune autre modification (prompts, structure, validation, parsing JSON restent identiques). Les fonctions seront redéployées automatiquement.