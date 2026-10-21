# Environment variables

Reference for names the app reads. `next build` does not read `.env.development`. Server clients read environment variables inside a function, not at import time.

| Variable | Where it is read | Required |
| --- | --- | --- |
| `PORT` | `lib/auth/server.ts` and `lib/payments/checkout.ts` when `BETTER_AUTH_URL` is unset. Playwright reads it when its config loads. | No. Defaults to 3100. |
| `PGLITE_DATA_DIR` | `lib/db/client.ts` inside `getDb`. | No. Defaults to `.data/pglite`. `memory` opens an in-memory database. |
| `DATABASE_URL` | `lib/db/client.ts` inside `getDb`. | Yes in production. A missing value throws. `PGLITE_DATA_DIR` is ignored in production. Development uses PGlite when this is unset. |
| `EMAIL_TRANSPORT` | `lib/auth/send-mail.ts` inside the send function. | Production requires `resend`. Any other value throws. Development defaults to `file`. |
| `DEV_MAIL_DIR` | `lib/auth/send-mail.ts` when the transport is `file`. | No. Defaults to `.dev-mail`. |
| `RESEND_API_KEY` | `lib/auth/send-mail.ts` when the transport is `resend`. | Yes for the Resend transport. |
| `EMAIL_FROM` | `lib/auth/send-mail.ts` when the transport is `resend`. | Yes for Resend. A blank value or an `@resend.dev` sender throws. |
| `RATE_LIMIT_STORE` | `lib/security/rate-limit-store.ts` inside `createRateLimitStore`. | Production requires `upstash`. Development defaults to `memory`. `memory` throws in production. |
| `UPSTASH_REDIS_REST_URL` | `lib/security/rate-limit-store.ts` when the store is `upstash`. | Yes with `RATE_LIMIT_STORE=upstash`. |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/security/rate-limit-store.ts` when the store is `upstash`. | Yes with `RATE_LIMIT_STORE=upstash`. |
| `POLICY_ID_SECRET` | `tools/legal/publish.ts` inside the public id function. | Yes in production. At least 16 characters. Development uses a fixed local secret. |
| `STRIPE_SECRET_KEY` | `lib/payments/stripe-client.ts` inside the Stripe client. | Yes for checkout, portal, and live webhooks. |
| `STRIPE_WEBHOOK_SECRET` | `lib/payments/stripe-client.ts` inside webhook verification. | Yes to verify Stripe webhooks. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `components/sign-in-form.tsx`. | Yes in production so the sign-in widget can render. |
| `TURNSTILE_SECRET_KEY` | `lib/auth/server.ts` inside `turnstileSecret`. | Yes in production. Development falls back to the Cloudflare test secret. |
| `BETTER_AUTH_SECRET` | `lib/auth/server.ts` inside `authSecret`. | Yes in production. `AUTH_SECRET` is the fallback name. |
| `AUTH_SECRET` | `lib/auth/server.ts` inside `authSecret` when `BETTER_AUTH_SECRET` is unset. | Alternative to `BETTER_AUTH_SECRET`. |
| `BETTER_AUTH_URL` | `lib/auth/server.ts` and `lib/payments/checkout.ts`. Also allowed as a write Origin. | Yes in production. Development defaults to `http://127.0.0.1:$PORT`. Loopback trusted origins are added only outside production. |
| `NEXT_PUBLIC_SITE_URL` | `lib/seo/pages.ts` inside `siteOrigin`. Also allowed as a write Origin. | No. Defaults to `https://plainden.com`. |
| `TOOLS_DISABLED` | `lib/catalog/visibility.ts` inside `disabledToolIds`. | No. When unset or empty, the default hidden set is scaffold, image, legal, receipt, video, data, subtitles, and cookie-refund. A set value replaces that list. |

These names are not read by application code yet. `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, and `CHECKOUT_ENABLED`. `BETTER_AUTH_SECRETS` is read by the Better Auth package for secret rotation, not by an application module.

`.env.development` holds test values only. Do not commit real keys.
