## Diagnostic

L'edge function `supabase/functions/chat/index.ts` appelle directement **Claude (Anthropic)** via `https://api.anthropic.com/v1/messages` avec le modèle `claude-sonnet-4-20250514`, et dépend de la variable `ANTHROPIC_API_KEY`.

Causes possibles de la panne actuelle :
- `ANTHROPIC_API_KEY` manquante, expirée ou crédits épuisés (réponse `503 Configuration serveur manquante` ou `401`).
- Surcharge Anthropic (`529`) ou rate-limit (`429`).
- Modèle `claude-sonnet-4-20250514` indisponible/déprécié sur le compte.

Aucun log récent côté `chat` n'est présent — cohérent avec un échec d'auth ou une erreur silencieuse côté front.

**Conclusion** : oui, basculer sur **Lovable AI Gateway** est la bonne solution. Avantages :
- `LOVABLE_API_KEY` est déjà provisionnée automatiquement (Lovable Cloud actif), zéro configuration utilisateur.
- Format OpenAI-compatible → on supprime tout le code de transformation SSE Anthropic → OpenAI (≈ 60 lignes en moins, plus fiable).
- Gestion native des erreurs `429` (rate-limit) et `402` (crédits).

## Ce qui change

### Fichier modifié : `supabase/functions/chat/index.ts`

1. **Remplacer l'appel Anthropic** par un appel à `https://ai.gateway.lovable.dev/v1/chat/completions` :
   - Header : `Authorization: Bearer ${LOVABLE_API_KEY}`
   - Body : `{ model, messages: [{role:"system", content: systemPrompt}, ...conversationMessages], stream: true }`
   - Modèle : `google/gemini-3-flash-preview` (rapide, multimodal, supporte images — équivalent fonctionnel de Claude Sonnet pour ce coach financier).

2. **Supprimer la conversion en format Anthropic** (lignes 322-338) : la passerelle accepte déjà le format OpenAI `image_url` qu'on construit déjà lignes 287-302.

3. **Supprimer la transformation SSE Anthropic → OpenAI** (lignes 384-432) : on renvoie directement `response.body` au client puisque le flux est déjà au format OpenAI/SSE attendu par le front.

4. **Mettre à jour la gestion d'erreurs** :
   - Remplacer la vérification `ANTHROPIC_API_KEY` par `LOVABLE_API_KEY`.
   - Ajouter le cas `402` (crédits Lovable AI épuisés) avec message clair en français.
   - Conserver `429` (rate-limit) et fallback générique.

5. **Le front (`src/pages/Assistant.tsx` et le parsing SSE existant) n'a pas besoin d'être modifié** : il consomme déjà du SSE format OpenAI (`choices[0].delta.content`).

### Préservé à l'identique
- Toute la logique de chargement du contexte financier (profil, transactions, dettes, tontines, épargne).
- Le `systemPrompt` complet et tous les blocs JSON (`transaction`, `debt`, `tontine_action`, `savings_action`, `update_action`).
- L'authentification JWT, la validation des messages, la limite de 50 messages / 5000 caractères.
- Le support des pièces jointes images et fichiers.

## Après la migration

- Le secret `ANTHROPIC_API_KEY` peut rester en place (inoffensif) ou être supprimé plus tard.
- Aucune action utilisateur requise — `LOVABLE_API_KEY` est déjà disponible.
- Si le coût/qualité d'un autre modèle est préféré (ex. `google/gemini-2.5-pro` pour plus de précision, ou `openai/gpt-5-mini`), un seul paramètre à changer côté edge function.

Approuve ce plan et je lance la migration.