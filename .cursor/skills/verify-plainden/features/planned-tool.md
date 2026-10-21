# Planned tool

Wave 2 and wave 3 tools are built. The home overview and the sidebar list them. A direct visit opens the real tool.

## Sub-features

- `planned-open` checks the landing page links each tool in the sidebar.
- `planned-copy` opens the privacy generator and shows the form.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/`. The sidebar links receipt, privacy, image, video, data, subtitles, and cookie and refund.
- Open `http://127.0.0.1:3100/privacy-policy-generator` directly.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open the page.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive planned-tool`. The drive opens `/`, checks the sidebar names are present, then opens `/privacy-policy-generator`.
- **Built copy.** The heading is `Privacy policy generator`. The text `This tool is not built yet.` is absent. The label `Business name` is visible.
- **Proof.** The drive writes `evidence/planned-tool/actions.txt`, `evidence/planned-tool/aria.txt`, and `evidence/planned-tool/page.png`.

## Gotchas

- The placeholder sentence remains only for a slug with no registered tool. Batch B registered the product tools.
