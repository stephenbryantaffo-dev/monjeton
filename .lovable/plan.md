

# Update App — Clean Up Recent Feature Integrations

After reviewing the entire codebase, all recent features (receipt audit system, PIN lock, discreet mode, caisse de cotisation, security fixes) are properly integrated. Routes exist, components are imported, and the database schema matches. The remaining work is cleanup and polish.

## Changes

### 1. Remove unnecessary `as any` casts in Receipts.tsx
The `receipt_scan_history` table now exists in the auto-generated types. Remove the `as any` casts on lines 94 and 190 for proper type safety.

### 2. Remove unnecessary `as any` casts in Scan.tsx  
The `receipt_scans` insert on line 189 uses `as any` but the types already support all those fields. Clean it up. Same for the `receipts` table insert (line 145) and `transactions` insert (line 228).

### 3. Add lock icon on "Mes Reçus" link in Settings.tsx
When PIN is enabled, show a small Lock icon next to "Mes Reçus" in the settings menu to indicate it's protected. Import `usePrivacy` (already imported) and conditionally render the icon.

### 4. Add lock icon on the Scan.tsx receipts link
Same lock indicator on the "Mes reçus" link at the bottom of the Scan page.

### 5. Remove `as any` casts in Tontine.tsx
Clean up type casts for `tontine_payments`, `tontine_cycles` inserts/updates (lines 173, 178, 210, 212) since these tables exist in types.

### 6. Remove `as any` in Wallets.tsx
Clean the wallet insert/update casts (lines 99, 110).

## Files Modified
- `src/pages/Receipts.tsx` — remove 2x `as any`
- `src/pages/Scan.tsx` — remove 3x `as any`, add lock icon
- `src/pages/Settings.tsx` — add lock icon on Mes Reçus menu item
- `src/pages/Tontine.tsx` — remove 4x `as any`
- `src/pages/Wallets.tsx` — remove 2x `as any`

No database changes needed. No new dependencies.

