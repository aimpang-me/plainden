# Legal pages

Terms, privacy, and refunds are linked from the footer. The cookie banner offers Accept and Decline. Decline is stored in this browser and optional cookies stay off. `/api/health` answers without reading the database. An unknown hosted policy id returns 404.

## Sub-features

- `legal-terms` shows the Paddle merchant of record sentence on `/terms`.
- `legal-privacy` shows `/privacy` after Decline and hides the banner.
- `legal-refund` repeats the Paddle sentence on `/refund`.
- `legal-health` returns `{ "ok": true }` from `/api/health`.
- `legal-missing-policy` returns 404 for an unknown 32 hex `/p/<id>`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/terms`.
- Choose `Terms`, `Privacy`, or `Refunds` in the footer.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Terms and the banner.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive legal-pages`. The heading is `Terms`. The page contains the Paddle merchant sentence. Click `Decline`.
- **Privacy and refunds.** The same drive opens `/privacy` and expects the heading `Privacy` with the Decline button gone. It then opens `/refund` and expects the heading `Refunds` plus the same Paddle sentence.
- **Health and a missing policy.** The same drive checks `GET /api/health` is 200 with `ok` true, and `GET /p/` plus 32 hex characters that are not published is 404.
- **Proof.** The drive writes `evidence/legal-pages/actions.txt`, `evidence/legal-pages/aria.txt`, and `evidence/legal-pages/page.png`.

## Gotchas

- Decline is stored in `localStorage` under `plainden-cookie-choice`. A later drive in the same browser profile starts with the banner hidden. This drive uses a fresh browser context.
- The health route does not open the database. A missing `DATABASE_URL` still returns 200.
