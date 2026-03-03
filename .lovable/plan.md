

## Two bugs identified

### Bug 1 — Voice-detected date is ignored on save

In `handleVoiceConfirm` (NewTransaction.tsx, line 209-248), the date used when inserting into the database is always `today`:

```typescript
const today = new Date().toISOString().split("T")[0];
// ...
date: today,  // line 248 — ignores tx.date entirely
```

The `ParsedTransaction` interface already has a `date` field, and the VoiceConfirmationDialog lets the user edit it. But `handleVoiceConfirm` never reads `tx.date`.

**Fix**: Replace `date: today` with `date: tx.date || today` on line 248.

### Bug 2 — Voice-detected date is not mapped from AI response

In `processVoice` (NewTransaction.tsx, lines 177-186), the mapped transactions object does **not** include the `date` field from the AI response:

```typescript
const mappedTxs: ParsedTransaction[] = parsed.transactions.map((tx: any) => ({
  amount: tx.amount || 0,
  type: tx.type || "expense",
  // ... no "date" field here
}));
```

**Fix**: Add `date: tx.date || null` to the mapping.

### Bug 3 — Dashboard does not refresh when navigating back

The Dashboard fetches data in a `useEffect` that depends on `[user, activePeriod, customRange]`. When you navigate away and come back, React re-mounts the component and the effect runs again, so it *should* refresh. However, if the component is cached by React Router or if state persists, the data may be stale.

The more likely cause is **Bug 1**: the voice transaction is saved with today's date hardcoded, but if the user said "hier" (yesterday), the transaction gets date = today. Then on the Dashboard, if "Aujourd'hui" is selected, the transaction appears. But if "Hier" is selected, it does not — creating the illusion that the dashboard is not updating.

Once Bug 1 and Bug 2 are fixed, the dashboard will show voice transactions on the correct date.

---

## Implementation plan

### File: `src/pages/NewTransaction.tsx`

**Change 1** — Add `date` to the mapped voice transactions (around line 186):
```typescript
date: tx.date || null,
```

**Change 2** — Use the parsed date when inserting (line 248):
```typescript
date: tx.date || today,
```

Both changes are single-line edits. No database or edge function changes needed.

