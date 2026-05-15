## Objectif

Désactiver temporairement le multi-scan (qui bug) et revenir à l'ancien comportement : un scan = une transaction détectée et validée via la fiche `ScanResultCard`.

## Changements

### `src/pages/Scan.tsx` — refonte du flux scan
- Retirer l'import et l'utilisation de `MultiReceiptValidator`.
- Remplacer l'état `multiScanResult` par `scanResult: ParsedResult | null`.
- Charger `categories` et `wallets` de l'utilisateur (nécessaires à `ScanResultCard`).
- Appeler l'edge function **`scan-receipt`** (singulier) au lieu de `scan-receipts`, avec le payload attendu : `{ image: base64, mimeType }`.
- Afficher `<ScanResultCard>` quand un résultat est présent :
  - `onConfirm(data)` → insérer une ligne dans `transactions` (montant, date, catégorie, wallet, devise, marchand en note) + créer une entrée `receipt_scans` confirmée → rafraîchir l'historique et les stats → toast succès.
  - `onReject()` → enregistrer le scan en `rejected` (ou simplement fermer) → reset state.
- Garder intacts : compteur de scans gratuits, upload caméra/galerie, compression > 4 Mo, `ScanHistory`, lien vers `/receipts`.

### Fichiers conservés (non supprimés, pour réactivation future)
- `src/components/scan/MultiReceiptValidator.tsx`
- `supabase/functions/scan-receipts/index.ts`

Aucune migration SQL, aucune modification d'autre page.

## Détails techniques

- L'edge function `scan-receipt` retourne déjà un objet plat `ParsedResult` (montant, marchand, date, catégorie, devise, conversion XOF). Pas de tableau `receipts[]`.
- Si `total_detected` n'existe plus dans cette réponse, on considère qu'un résultat avec `amount > 0` est valide ; sinon toast "Aucune transaction détectée".
- L'incrément du compteur `scan_counter` reste sur succès uniquement (avant `setScanResult`).

## Hors scope
- Pas de suppression définitive du code multi-scan.
- Pas de modification de la page `Receipts`, ni du système de PIN, ni de l'historique.
