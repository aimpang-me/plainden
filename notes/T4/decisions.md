# T4 decisions

- Static payloads are a codec table in `tools/qr/engine.ts`. Kinds are link, text, Wi-Fi, and contact. Only the link kind can be published.
- A link is parsed with `URL`. `https://example.com` is stored as `https://example.com/`. `javascript:` and URLs with a username are refused.
- Text is capped at 800 characters. A target URL is capped at 2048 characters.
- A logo is a PNG, JPEG, or WebP data URL of at most 200000 characters. The SVG draws it in the center at about 22 percent of the width, with error correction H. PNG downloads do not composite the logo, because Vitest has no canvas. Error correction without a logo is M. PNG width is 512.
- Dynamic rows use the existing `qr_codes` table. `saved.ts` is the only writer. `recordScan` is the only writer of `scanCount`.
- `GET /q/[id]` returns 302, `cache-control: no-store`, and `x-plainden-scans` set to the new count. A missing id returns 404. A lapsed plan can still scan. Create and edit call `checkLimit` with `savedItems`. Remove does not check the plan, and a second remove succeeds.
- The cap number stays in `config.limits`. Free is 0 and paid is 20, matching `lib/catalog/planned.ts`.
- Two publishes at the same moment can both pass the cap. The check and the insert are separate statements.
- `getCurrentUser()` returns null, so the page cannot publish in the browser. The client shows `free savedItems allows 0` from `decideLimit` before it calls the API.
- localStorage keys are `plainden.qr.staticGenerations` and `plainden.qr.savedCount`. Neither one blocks a static download.
- `lib/registry/slugs.test.ts` still expects only the scaffold id. That file is not owned here.
- verify-plainden feature ids are hardcoded, so the QR browser proof is `notes/T4/drive-qr.mjs` against the server that skill launches on port 3100.
