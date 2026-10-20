# Environment variables

Reference for names the site expects. A row marked "not confirmed from code" is a name from PLAN.md, `.env.example`, or the installed `better-auth` package. No application module reads it yet. F-b is adding auth, Stripe, Resend, and Neon in parallel, so those rows are listed before that code is on this branch.

`next build` does not read `.env.development`. Server clients must read environment variables inside a function, not at import time.

| Variable | Service | Named in | App reads it |
| --- | --- | --- | --- |
| `PORT` | Local server | `.env.example`, `.env.development`, `playwright.config.ts` | Yes. `playwright.config.ts` reads it when the file loads. |
| `PGLITE_DATA_DIR` | Local database | `.env.example`, `.env.development`, `lib/db/client.ts` | Yes. `getDb` reads it when called. |
| `DATABASE_URL` | Neon | `.env.example`. `notes/F/decisions.md` reserves it for Neon. | No. Not confirmed from code. |
| `EMAIL_TRANSPORT` | Resend, file transport in dev | PLAN.md, `.env.example`, `.env.development`, README | No. Not confirmed from code. |
| `RESEND_API_KEY` | Resend | `.env.example` | No. Not confirmed from code. The `resend` package is not installed. |
| `STRIPE_SECRET_KEY` | Stripe | `.env.example` | No. Not confirmed from code. `lib/payments` throws `PaymentsNotConfigured` and does not read it. The Stripe package is not installed. |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `.env.example` | No. Not confirmed from code. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile, used with auth | `.env.example`, `.env.development` | No. Not confirmed from code. |
| `TURNSTILE_SECRET_KEY` | Turnstile, used with auth | `.env.example`, `.env.development` | No. Not confirmed from code. |
| `BETTER_AUTH_SECRET` | Better Auth | Installed `better-auth` `dist/context/create-context.mjs` | No. Not confirmed from application code. The package requires it in production. `lib/auth/get-current-user.ts` does not read it. |
| `BETTER_AUTH_URL` | Better Auth | Installed `better-auth` `dist/utils/url.mjs` | No. Not confirmed from application code. |
| `BETTER_AUTH_SECRETS` | Better Auth secret rotation | Installed `better-auth` `dist/context/create-context.mjs` | No. Not confirmed from application code. Optional. |
| `SENTRY_DSN` | Sentry | `.env.example`, PLAN.md stack | No. Not confirmed from code. |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | `.env.example`, PLAN.md stack | No. Not confirmed from code. |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | `.env.example`, PLAN.md stack | No. Not confirmed from code. |
| `CHECKOUT_ENABLED` | Kill switch | PLAN.md F8 | No. Not confirmed from code. |
| `TOOLS_DISABLED` | Kill switch | PLAN.md F8 | No. Not confirmed from code. |

`.env.development` holds test values only. Turnstile test keys there are `1x00000000000000000000AA` and `1x0000000000000000000000000000000AA`. Do not commit real keys.
