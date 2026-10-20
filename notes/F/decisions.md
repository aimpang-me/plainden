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

## F-b

- Magic link is Better Auth. `EMAIL_TRANSPORT=file` writes one JSON file per message under `.dev-mail`. Playwright and the verify skill open that URL.
- The sign-in form pre-seeds `XXXX.DUMMY.TOKEN.XXXX` when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is the Cloudflare test key. The captcha plugin still runs siteverify.
- `getDb` stores its PGlite and Neon promises on `globalThis`. Next compiles the account server action and the auth route as two copies of `lib/db/client.ts`. A module-level Map gave each copy its own PGlite, so a session written by one was invisible to the other.
- Neon opens only when `DATABASE_URL` is set and `PGLITE_DATA_DIR` is unset. Any other case uses PGlite.
- `checkLimit` writes the usage row after `decideLimit` returns ok. Workers keep the CONTRACT signature. `fileSize` and `batchCount` stay per request and do not write a row.
- `useEntitlement` still returns `{ plan: "free" }`. The hook is synchronous, so it cannot call `getCurrentUser`.
- `checkout.session.completed` inserts an active row and does not rewrite a later status. `customer.subscription.updated` replaces status, price, and period. `customer.subscription.deleted` sets `canceled`. `invoice.payment_failed` sets `past_due`.
- Webhook tests sign fixtures with `stripe.webhooks.generateTestHeaderString`. `scripts/stripe/sync-prices.ts` was not run.
- `.env.development` sets `BETTER_AUTH_SECRET` to `plainden-dev-secret-0123456789abcdef`. `getAuth` throws in production when that secret is missing. It does not read the secret at import time.
