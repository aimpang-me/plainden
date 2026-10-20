# F-a decisions

- Branch is `cursor/fa-foundation-28f8`. Cloud agents require that prefix and the `-28f8` suffix. PLAN.md asked for `worker/F`.
- `LimitKind` is a const object so `scripts/gen-registry.ts` can import it under Node type stripping.
- The database handle is `getDb()`. A sync `db` export would read `PGLITE_DATA_DIR` at import time.
- Local data is PGlite only. `DATABASE_URL` is listed in `.env.example` and is not read. Neon waits for a later F session.
- Schema SQL is derived from the Drizzle tables in `lib/db/apply.ts`. `drizzle-kit generate` stays with F-d.
- Better Auth columns stay camelCase so a later Drizzle adapter matches field names without a remap.
- `checkLimit` does not write usage. F6 adds counters and keeps this signature.
- `useEntitlement` always returns the free plan while `getCurrentUser` returns null.
- Payments throw `PaymentsNotConfigured`. No Stripe SDK is installed.
- The dummy tool is `tools/scaffold` at `/scaffold-check`. Its price is `plainden_scaffold_month` at 0 cents, so the pricing page hides it. The landing page does not link to it.
- Theme ignores the system color scheme. First paint stays `light` unless `localStorage` already has `plainden-theme`.
- `app/[slug]/page.tsx` sets `instant = false` so cache components can read the slug. `next.config.ts` allows dev origins `127.0.0.1` and `localhost`.
- No GitHub Actions workflow is added. Tests run locally.
