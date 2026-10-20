# QR code

A static link downloads a PNG. A free visitor cannot publish a dynamic code. A missing redirect is a 404.

## Sub-features

- `qr-static` downloads a PNG from the no-expiration page.
- `qr-free-publish` shows the free saved-item limit on the dynamic page.
- `qr-missing` returns 404 for an unknown `/q/` id.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/qr-code-generator-no-expiration` and choose `Create`.
- Open `http://127.0.0.1:3100/dynamic-qr-code` and choose `Create`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Static PNG.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive qr`. The drive opens `/qr-code-generator-no-expiration`, clicks `Create`, and expects status `Downloaded PNG.`
- **Free publish.** The drive opens `/dynamic-qr-code`, clicks `Create`, and expects status `free savedItems allows 0`.
- **Missing id.** `GET /q/not-a-code` returns 404.
- **Proof.** The drive writes `evidence/qr/actions.txt`, `evidence/qr/aria.txt`, and `evidence/qr/page.png`.

## Gotchas

- The page starts on the free plan, so publish stays blocked until `/api/entitlement` returns paid.
- A stored `http` or `https` target redirects and counts a scan. A `javascript:` target returns 404 and does not count. Those two cases are Vitest, because this drive does not insert a row into the running database.
