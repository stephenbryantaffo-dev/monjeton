## Objectif

Faire passer l'assistant virtuel, le scan AI et le budget au niveau supérieur via : modèles plus puissants, tool calling réel, mémoire long terme, OCR multi-reçus et migration de Claude vers Lovable AI Gateway.

---

## 1. Assistant virtuel (`supabase/functions/chat/index.ts` + `src/pages/Assistant.tsx`)

### a) Modèle plus puissant
- Passer de `google/gemini-3-flash-preview` à **`google/gemini-3.1-pro-preview`** (raisonnement plus fin, multimodal, latence acceptable).
- Conserver le streaming SSE existant.

### b) Tool calling réel (actions depuis le chat)
Ajouter un loop de tool calling côté edge function avec ces tools :

| Tool | Action |
|---|---|
| `create_transaction` | Crée une dépense/revenu (montant, catégorie, wallet, note, date) |
| `create_debt` | Crée une dette/créance (personne, montant, échéance) |
| `record_payment` | Enregistre un paiement de dette |
| `set_budget` | Définit le budget total ou par catégorie |
| `create_savings_goal` | Crée un objectif d'épargne |
| `query_balance` | Renvoie le solde par wallet/global |

Chaque tool exécute un `INSERT/UPDATE` Supabase scopé à `user.id`. Validation Zod, garde-fou montants positifs, max 5 actions par tour.

Côté UI Assistant : afficher chaque appel d'outil dans une carte (icône + résumé + statut ✅/❌), avec accordéon pour voir les paramètres.

### c) Mémoire long terme
Nouvelle table `assistant_memory` :
- `user_id`, `key` (ex: `goals`, `preferences`, `family_context`), `value` (text), `updated_at`
- RLS user-only

Tools dédiés :
- `remember(key, value)` — l'IA enregistre une info clé
- `forget(key)` — l'utilisateur peut purger

Au début de chaque conversation, l'edge function injecte le contenu de `assistant_memory` dans le system prompt (limite 1500 chars).

### d) Ajustements UI mineurs
- Indicateur "L'assistant exécute une action…" pendant les tool calls.
- Toast succès quand une transaction/dette est créée via le chat → bouton "Voir" qui navigue vers la page concernée.

---

## 2. Scan AI (`supabase/functions/scan-receipt/index.ts` + `src/pages/Scan.tsx`)

### a) Modèle plus précis
- Passer de `google/gemini-2.5-flash` à **`google/gemini-2.5-pro`** (meilleure OCR sur tickets froissés, manuscrits, MoMo flous).

### b) Multi-reçus en une photo
- Étendre le prompt pour détecter N reçus distincts dans une même image et renvoyer un tableau `receipts[]` (chaque entrée = même schéma actuel : montant, marchand, date, catégorie, items).
- Sanitization serveur : max 10 reçus par image.
- UI Scan : si plusieurs reçus détectés, afficher une liste de cartes, chacune avec sa propre action "Enregistrer / Modifier / Ignorer", ou bouton "Tout enregistrer".

---

## 3. Budget

### a) Migration `budget-coaching-plan` : Claude → Lovable AI
- Remplacer l'appel `https://api.anthropic.com/v1/messages` par `https://ai.gateway.lovable.dev/v1/chat/completions`.
- Utiliser **`google/gemini-3.1-pro-preview`** (qualité de raisonnement équivalente à Sonnet pour ce use case).
- Conserver le system prompt actuel (déjà très solide).
- Utiliser le tool calling natif au lieu du parsing manuel JSON → format de sortie garanti.
- Idem pour `budget-rebalance-suggest` (même migration).
- Header `Authorization: Bearer ${LOVABLE_API_KEY}`.

### b) Prédictions améliorées
- Mettre à jour `supabase/functions/financial-score` et la logique de `src/lib/predictions.ts` pour utiliser **`google/gemini-3.1-pro-preview`** sur le calcul d'insights.
- Côté `BudgetAlertBanner` : enrichir les alertes 70 % avec une phrase prédictive générée (date estimée de dépassement + suggestion concrète d'action). Cache local 24h pour éviter coûts.

---

## Détails techniques

```text
chat/index.ts
├── Auth + getClaims (inchangé)
├── Charger assistant_memory → injecter dans systemPrompt
├── Boucle tool calling (max 5 itérations) :
│   ├── POST gateway avec tools=[...]
│   ├── Si tool_calls → exécuter handlers, push résultats
│   └── Sinon → stream final SSE au client
└── Pass-through SSE (inchangé pour la réponse finale)

scan-receipt/index.ts
├── Prompt v2 : "Détecte tous les reçus visibles, renvoie receipts[]"
├── Modèle gemini-2.5-pro
└── Sanitize array, max 10

budget-coaching-plan/index.ts
├── Remplacer fetch Anthropic par fetch Lovable Gateway
├── tool_choice: { function: "generate_budget_plan" }
└── Supprimer parsing markdown (plus nécessaire)
```

### Migration DB
```sql
CREATE TABLE assistant_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE assistant_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user own memory" ON assistant_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Secret ANTHROPIC_API_KEY
Une fois la migration faite, le secret n'est plus utilisé — on peut le laisser ou le supprimer ensuite.

---

## Hors scope (non touché)

- Refonte visuelle Assistant/Scan/Budgets (uniquement micro-ajustements UI listés).
- OCR multi-langues exotiques.
- Export PDF, badges, tontines, dettes.

---

## Validation

- ✅ Demander à l'assistant "Ajoute une dépense de 5000 transport hier" → transaction créée en BDD, carte tool affichée.
- ✅ "Souviens-toi que j'épargne pour acheter une moto" → enregistré dans `assistant_memory`, restitué à la conversation suivante.
- ✅ Photo avec 3 tickets côte à côte → 3 cartes scan distinctes.
- ✅ Génération plan budget fonctionne sans `ANTHROPIC_API_KEY`.
- ✅ Alerte budget 70 % affiche date prédictive de dépassement.
