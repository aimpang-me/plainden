# Scaffold tool

The scaffold tool lets a person submit a note and a count. A count of 1 is allowed on the free plan. A count of 4 is blocked and offers pricing.

## Sub-features

- `scaffold-allow` accepts count 1 and echoes the note, format, and slug.
- `scaffold-block` rejects count 4 with the free monthly cap.
- `scaffold-upgrade` shows a link to pricing when the check is blocked.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/scaffold-check`.
- The landing page does not link here. Type the path.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.
- `html[data-hydrated="true"]` is set before the form is submitted.

- **Allow a count of 1.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive scaffold-tool`. The drive fills Note `Hello` and Count `1`, then clicks `Check`. The status reads `Allowed on the free plan. Format text. Note Hello. Slug scaffold-check.`
- **Block a count of 4.** The same drive then fills Count `4` and clicks `Check`. The status reads `free perMonth allows 3`. The link `See pricing` is visible.
- **Proof.** The drive writes `evidence/scaffold-tool/actions.txt`, `evidence/scaffold-tool/aria.txt`, `evidence/scaffold-tool/allowed.png`, and `evidence/scaffold-tool/page.png`. `page.png` is the blocked state.

## Gotchas

- Submit before hydration uses the browser form submit and clears the status. Wait for `data-hydrated`.
- The free cap is 3 per month. Count `3` is allowed. Count `4` is the block this recipe uses.
- This page always uses the free plan in F-a. A signed-in paid result is not available yet.
- Long tail paths such as `/scaffold-check-limit` exist. This recipe drives `/scaffold-check` only.
