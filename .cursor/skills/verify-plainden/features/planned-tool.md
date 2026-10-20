# Planned tool

A planned tool page shows the tool name and the sentence `This tool is not built yet.`

## Sub-features

- `planned-open` opens the image placeholder from the landing list.
- `planned-copy` shows the not-built sentence and no working form.

## How to get to it (user POV)

- On the landing page, choose `Image tools`.
- Open `http://127.0.0.1:3100/compress-image` directly.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open the placeholder.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive planned-tool`. The drive opens `/`, clicks the link `Image tools`, and lands on `/compress-image`.
- **Placeholder copy.** The heading is `Image tools`. The text `This tool is not built yet.` is visible. There is no button named `Check`.
- **Proof.** The drive writes `evidence/planned-tool/actions.txt`, `evidence/planned-tool/aria.txt`, and `evidence/planned-tool/page.png`.

## Gotchas

- Privacy, terms, cookie, and refund are built, so they no longer show this sentence. This recipe proves `compress-image` only.
- Other planned slugs use the same placeholder. Do not mark those tools verified from this one page.
