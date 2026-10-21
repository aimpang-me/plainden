# plainden

Small browser tools. One Next.js app. Free with limits, then a monthly price from `lib/pricing/catalog.ts`.

## Run

1. Install dependencies with `npm install`. That also writes `tools/registry.generated.ts`.
2. Start the app with `npm run dev`. The port is `3100` from `.env.development`.
3. Open `http://127.0.0.1:3100`.

Invoice, receipt, PDF, and QR are on the landing page. Other planned tools such as `/privacy-policy-generator` open when you use the direct URL. Terms, privacy, and refunds are linked from the footer.

## Test

- `npm test` regenerates the registry and runs Vitest.
- `npm run test:e2e` starts Next on `PORT` (default `3100`) and runs Playwright.
- `npm run build` runs the production build.
- `npm run lint` runs `eslint .`.

`next build` and `eslint .` pass with no environment variables set. `.env.development` is for `next dev` only.

## Env

`.env.development` is committed and holds test values only: PGlite, `EMAIL_TRANSPORT=file`, and the Cloudflare Turnstile test keys. `.env.example` lists the production names with empty values. Do not commit real keys.
