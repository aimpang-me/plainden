---
name: verify-plainden
description: "Drive the plainden Next.js site in a real browser. Use to launch the local dev server, check that this run owns it, exercise a mapped page, and keep screenshots after cleanup."
---

# Verify plainden

plainden is a Next.js site. The user surface is the browser at `http://127.0.0.1:3100`. This skill starts that server, drives one mapped feature with Playwright, and stores proof under `evidence/`. The feature map is `features/README.md`.

One verification server owns port 3100. Refuse to start a second one. Do not drive a server this run did not start.

## Launch

From the repo root:

```bash
node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs launch
```

The helper starts `npx next dev --port 3100` in its own process group. It sets `PORT=3100` and `PGLITE_DATA_DIR` to `.data/verify-pglite` for that process only. Ready means `GET http://127.0.0.1:3100/` returns HTTP 200. The pid and log live in `.cursor/skills/verify-plainden/.run/`. That directory is gitignored.

If port 3100 already answers, or a recorded pid is still alive, launch exits 1 and does not start another server.

## Doctor

```bash
node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs doctor
```

Doctor is read only. It passes only when all of these are true:

- `.run/pid` exists and that pid is alive.
- `GET http://127.0.0.1:3100/` returns HTTP 200.
- The body contains `Small tools that run in the browser`.
- `.run/meta.json` records port `3100` and data dir `.data/verify-pglite`.

Run doctor before a drive. If it fails, do not click through a server you do not own.

## Drive

```bash
node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive <feature-id>
```

Feature ids: `landing`, `planned-tool`, `pricing`, `theme`, `sign-in`, `invoice-generator`, `receipt-generator`, `pdf`, `qr`, `seo`, `privacy-policy`, `image`, `video`, `data`, `subtitles`, `legal-pages`.

The helper opens Chromium against `http://127.0.0.1:3100`, waits until `html[data-hydrated="true"]`, then uses accessible names:

| Handle | Selector |
| --- | --- |
| Site name | link `plainden` |
| Pricing nav | link `Pricing` |
| Theme | button `Switch to dark`, then button `Switch to light` |
| Support | link `support@plainden.com` with `href` `mailto:support@plainden.com` |
| Invoice entry | link `Invoice generator` |
| Placeholder | text `This tool is not built yet.` |
| Your name | textbox `Your name` |
| Client name | textbox `Client name` |
| Invoice number | textbox `Invoice number` |
| Receipt number | textbox `Receipt number` |
| Description | textbox `Description` |
| Quantity | textbox `Quantity` |
| Unit price | textbox `Unit price` |
| Payment method | combobox `Payment method` |
| Download | button `Download PDF` |
| Terms | link `Terms` |
| Cookie decline | button `Decline` |
| Upgrade | link `See pricing` |
| Account nav | link `Sign in` |
| Email | textbox `Email` |
| Send link | button `Email me a sign-in link` |
| Sign out | button `Sign out` |

`legal-pages` opens `/terms`, checks the Paddle merchant sentence, clicks Decline, then checks `/privacy`, `/refund`, `/api/health`, and a 404 for an unknown hosted policy id.

Recipes for the other ids are in `features/`. Drive one id per command.

## Evidence

Each drive writes `.cursor/skills/verify-plainden/evidence/<feature-id>/`:

- `actions.txt` lists each user action and the status or attribute that followed.
- `aria.txt` is the ARIA snapshot of `main` after the last action. `theme` also writes `aria-dark.txt` while `data-theme` is `dark`.
- `page.png` is a full page screenshot after the last action. `theme` also writes `dark.png`.

The screenshot includes the header link `plainden`. Proof uses the real pages. It does not call test-only endpoints. `sign-in` writes `evidence/sign-in/` after the account page shows the address from a `.dev-mail` link. That drive uses the file mail transport and the Turnstile test key. It does not call Paddle, Resend, or Neon.

## Cleanup

```bash
node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs cleanup
```

Cleanup reads `.run/pid` and signals that process group. It then deletes `.run/` and `.data/verify-pglite`. It does not delete `evidence/`. It does not kill by process name. After cleanup, `evidence/<feature-id>/` must still exist.

## Helpers

`scripts/plainden-verify.mjs` is the only helper. Invoke it as shown above. Commands are `launch`, `doctor`, `drive`, and `cleanup`.

## Maintenance

When routes or labels change, update this skill and `features/` with `/maintain-verification-skill`.
