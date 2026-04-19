
The file `src/components/ui/animated-login.tsx` already exists (visible in current-code) and is correctly imported by Login.tsx. The console logs show the app IS rendering (Pricing component warnings, Landing page mounting). No black screen evidence.

Real issue: likely PWA service worker cache on the other device serving a stale broken build, OR the user hasn't republished after recent changes.

## Diagnostic plan

**Findings**
- `animated-login.tsx` exists and exports all needed components — no broken import
- Console logs show app rendering normally (Landing, Pricing mounting)
- Only warnings (forwardRef on Pricing, framer-motion scroll container) — not fatal
- `logo-monjeton.png` is referenced and assumed present

**Most likely cause: PWA service worker**
`vite.config.ts` uses `VitePWA` with `registerType: "autoUpdate"`. On a device that previously visited the site, the SW serves cached assets. If a previous deploy was broken, the cache keeps serving it until updated.

**Proposed fix (single small change)**
Add `skipWaiting: true` and `clientsClaim: true` to the workbox config in `vite.config.ts` so new versions activate immediately and replace cached broken builds.

```ts
workbox: {
  navigateFallbackDenylist: [/^\/~oauth/],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
},
```

**Then**: republish via Publish → Update.

**For the affected device** (immediate fix without code change):
- Hard reload: Ctrl+Shift+R (desktop) or close all tabs + clear site data
- If installed as PWA: uninstall and reinstall
- Or visit `jetonclair.com/?v=2` once to bypass cache

**What I will NOT do**
- Recreate `animated-login.tsx` (already exists and works)
- Modify Login.tsx imports (not broken)
- Touch the logo (no evidence it's missing)

Approve to apply the PWA cache fix in `vite.config.ts`.
