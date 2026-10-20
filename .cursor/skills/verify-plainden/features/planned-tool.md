# Planned tool

A planned tool page shows the tool name and the sentence `This tool is not built yet.`

## Sub-features

- `planned-open` opens the invoice placeholder from the landing list.
- `planned-copy` shows the not-built sentence and no working form.

## How to get to it (user POV)

- On the landing page, choose `Invoice generator`.
- Open `http://127.0.0.1:3100/invoice-generator` directly.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open the placeholder.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive planned-tool`. The drive opens `/`, clicks the link `Invoice generator`, and lands on `/invoice-generator`.
- **Placeholder copy.** The heading is `Invoice generator`. The text `This tool is not built yet.` is visible. There is no button named `Check`.
- **Proof.** The drive writes `evidence/planned-tool/actions.txt`, `evidence/planned-tool/aria.txt`, and `evidence/planned-tool/page.png`.

## Gotchas

- Other planned slugs use the same placeholder. This recipe proves `invoice-generator` only. Do not mark the other nine tools verified from this one page.
- If a later worker registers `tools/invoice/`, this page becomes the real tool. Update this file when that lands.
