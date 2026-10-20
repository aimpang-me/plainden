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

## F-c

- Merge order was V, then S, then T1, then T3, then T4, onto main at e145f66. Landing, pricing, and theme screenshots stayed with F-b. The planned-tool proof stayed with T1 because invoice is now a real tool.
- The branch is `worker/F-c` because the operator named that branch.
- qrcode is pinned at 1.5.4 and `@types/qrcode` at 1.5.5. V, S, T1, and T3 added no packages.
- `/sitemap.xml` and `/robots.txt` call `buildSitemap` and `buildRobots`. Home, pricing, and tool pages return `metadataFor` and render `JsonLd`. `metadataBase` is `siteOrigin()`.
- `proxy.ts` is not in this session. V asked F8 to import `securityHeaders` and `unenforcedRateLimit` there, and PLAN step F8 owns that wiring. `rateLimitFlag.enforced` stays false.
- `useEntitlement` stays synchronous. It returns free, then replaces the plan from `GET /api/entitlement`. A signed-out visitor stays on the free plan. The invoice Save button and QR publish follow that plan.
- `checkLimit` treats `savedItems` as the occupancy the caller already counted. `perDay` and `perMonth` still add a usage row. Twenty sequential QR publishes are the lock for the cap of 20.
- `GET /q/[id]` runs `parseTargetUrl` on the stored target before it counts a scan. Only http and https redirect. A `javascript:` target returns 404 and does not increment `scanCount`. There is no interstitial and no blocklist. PLAN and the T4 notes do not ask for either.
- The registry id list is invoice, pdf, qr, receipt, and scaffold.
- `FileDrop` takes optional `multiple` and `accept`. Merge and JPG pass them.

## F-d

- Merge order was T8, then T7, then T6, then T2, then T5, onto main at 980d443. The operator named `worker/F-d`.
- The T2 merge conflict on the planned-tool drive kept the landing page hiding later waves. A direct `/privacy-policy-generator` opens the form. The binary screenshot stayed with the F-d side.
- `defaultDisabled` lists scaffold, image, legal, receipt, video, data, subtitles, and cookie-refund. Wave 1 (invoice, pdf, qr) stays public. A hidden tool still renders at its URL.
- `heic-to`, `papaparse`, `xlsx`, and `@types/papaparse` are in `package.json`. T5 and T7 had imported them without saving the dependency. `npm ci` has to install them.
- Production `connect-src` includes `blob:` so the ffmpeg worker can fetch the wasm blob. `tools/image/heic.ts` imports `heic-to/csp` because the default build needs `unsafe-eval`, which production CSP does not allow.
- `proxy.ts` returns 404 for `/p/<id>` when the id is not 32 hex digits, and still sets the security headers. A well-formed id with no row calls `notFound()` after `connection()`, so that response stays 200. Cache Components sends the shell before the database read.
- `data_presets` is generated by `drizzle-kit` into `db/migrations/0000_initial.sql`. The converter UI still stores presets in `localStorage`. The route is for a paid account.
- The rate limiter stays off. No analytics host was added to CSP. Hosted `/terms`, `/privacy`, and `/refund` pages stay with F8.
