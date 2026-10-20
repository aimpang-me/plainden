Static security headers are in `vercel.json` and `lib/security/csp.ts`.
Rate limiting is unenforced. `rateLimitFlag.enforced` is false because there is no shared store.
`ENV.md` lists Stripe, Resend, Neon, Better Auth, Turnstile, Sentry, and PostHog names. App code does not read the F-b names yet.
`PADDLE-SETUP.md` names `https://plainden.com/pricing`, `/terms`, `/privacy`, and `/refund`.
`next build` and `eslint .` passed with no environment variables set.
`npm test` passed 25 tests. `scripts/deploy/check-headers.ts` printed the unenforced flag.
Browser proof drove `/pricing` and `/`. Evidence is `.cursor/skills/verify-plainden/evidence/pricing` and `evidence/landing`.
The `next dev` response for `/pricing` was HTTP 200 and had no Content-Security-Policy header.
`/terms`, `/privacy`, and `/refund` are not built. No new packages.
