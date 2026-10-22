# Image tools

The compress page turns a PNG into a JPEG in the browser.

## Sub-features

- `image-open` shows the Image tools heading and the compress button.
- `image-compress` downloads a JPEG from `frame.png`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/compress-image`.
- Add an image and press Compress images.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Compress.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive image`. The heading is `Image tools`. The drive adds `e2e/tools-b/fixtures/frame.png` and clicks `Compress images`. A download link ends in `.jpg`.
- **Proof.** The drive writes `evidence/image/actions.txt`, `evidence/image/aria.txt`, and `evidence/image/page.png`.

## Gotchas

- HEIC conversion loads `heic-to` on submit. This drive uses a PNG, so it does not load that package.
- Image tools is linked from the landing page. Open `/compress-image` directly for the compress action.
