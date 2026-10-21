# Environment variables

Reference for names the app reads. `next build` does not read `.env.development`. Server clients read environment variables inside a function, not at import time.

| Variable | Where it is read | Required |
| --- | --- | --- |
| `PORT` | `lib/auth/server.ts` when `BETTER_AUTH_URL` is unset. Playwright reads it when its config loads. | No. Defaults to 3100. |
| `PGLITE_DATA_DIR` | `lib/db/client.ts` inside `getDb`. | No. Defaults to `.data/pglite`. `memory` opens an in-memory database. |
| `DATABASE_URL` | `lib/db/client.ts` inside `getDb` when `PGLITE_DATA_DIR` is unset. | No. When set, the app uses Neon HTTP. |
| `EMAIL_TRANSPORT` | `lib/auth/send-mail.ts` inside the send function. | No. Defaults to `file`. |
| `DEV_MAIL_DIR` | `lib/auth/send-mail.ts` when the transport is `file`. | No. Defaults to `.dev-mail`. |
| `RESEND_API_KEY` | `lib/auth/send-mail.ts` when the transport is `resend`. | Yes for the Resend transport. |
| `PADDLE_API_KEY` | `lib/payments/checkout.ts` inside the Paddle request. | Yes for checkout and the billing portal. |
| `PADDLE_WEBHOOK_SECRET` | `lib/payments/index.ts` inside webhook verification. | Yes to verify Paddle webhooks. |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | `components/paddle-checkout.ts` when the overlay opens. | Yes for the checkout overlay. |
| `NEXT_PUBLIC_PADDLE_ENV` | `lib/payments/checkout.ts` and `components/paddle-checkout.ts`. | No. Any value other than `production` uses the sandbox. |
| `PADDLE_PRICE_MONTHLY` | `lib/payments/checkout.ts` for a monthly catalog price. | Yes for monthly checkout. |
| `PADDLE_PRICE_YEARLY` | `lib/payments/checkout.ts` for a yearly catalog price. | Yes for yearly checkout. |
| `CHECKOUT_ENABLED` | `lib/payments/checkout.ts`. | No. Set to `false` to turn checkout and the portal off. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `components/sign-in-form.tsx`. | Yes in production so the sign-in widget can render. |
| `TURNSTILE_SECRET_KEY` | `lib/auth/server.ts` inside `turnstileSecret`. | Yes in production. Development falls back to the Cloudflare test secret. |
| `BETTER_AUTH_SECRET` | `lib/auth/server.ts` inside `authSecret`. | Yes in production. `AUTH_SECRET` is the fallback name. |
| `AUTH_SECRET` | `lib/auth/server.ts` inside `authSecret` when `BETTER_AUTH_SECRET` is unset. | Alternative to `BETTER_AUTH_SECRET`. |
| `BETTER_AUTH_URL` | `lib/auth/server.ts` and `lib/payments/checkout.ts`. Also allowed as a write Origin. | Yes in production. Checkout and the portal refuse to run when it is unset. Development defaults to `http://127.0.0.1:$PORT`. |
| `NEXT_PUBLIC_SITE_URL` | `lib/seo/pages.ts` inside `siteOrigin`. Also allowed as a write Origin. Checkout reads it in production. | Yes in production for checkout and the portal. Public pages default to `https://plainden.com`. |
| `NEXT_PUBLIC_SITE_PUBLIC` | `app/robots.ts`. | No. Robots disallow every path unless this is `true`. |
| `TOOLS_DISABLED` | `lib/catalog/visibility.ts` inside `disabledToolIds`. | No. When unset or empty, the default hidden set is scaffold, image, legal, receipt, video, data, subtitles, and cookie-refund. A set value replaces that list. |

These names are not read by application code yet. `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, and `NEXT_PUBLIC_POSTHOG_HOST`. `BETTER_AUTH_SECRETS` is read by the Better Auth package for secret rotation, not by an application module.

`.env.development` holds test values only. Do not commit real keys.
