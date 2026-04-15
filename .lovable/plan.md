

## Bundle Optimization for 3G Networks -- Status

All 4 requested optimizations are already implemented in the codebase:

| Optimization | Status | Details |
|---|---|---|
| Code splitting (manualChunks) | Done | 6 vendor chunks configured in vite.config.ts |
| Lazy loading (Landing) | Done | 7 sections lazy-loaded with Suspense |
| Image optimization | Done | `loading="lazy"` on non-critical images, `fetchPriority="high"` on PinLockScreen logo |
| PWA manifest | Done | `start_url: "/"`, `orientation: "portrait"`, correct icon entries |

### Minor Enhancement (optional)

The only small improvement possible is splitting `@tanstack/react-query` into its own `vendor-query` chunk (currently bundled with `vendor-react`) and adding Radix UI packages to `vendor-ui`. This would reduce the initial React chunk size by ~30KB gzipped.

### Plan

1. **Update `vite.config.ts`**: Move `@tanstack/react-query` from `vendor-react` to a new `vendor-query` chunk. Add `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-select` to `vendor-ui`.

This is a single-line change in vite.config.ts. Everything else is already in place.

