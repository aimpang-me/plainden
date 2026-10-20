# Theme

The header theme button switches the site between light and dark. The choice is stored in the browser under `plainden-theme`.

## Sub-features

- `theme-dark` sets `html[data-theme="dark"]` and renames the button to `Switch to light`.
- `theme-light` sets `html[data-theme="light"]` and renames the button to `Switch to dark`.

## How to get to it (user POV)

- Use the button in the header on any page. The landing page is the entry this map drives.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.
- `html[data-hydrated="true"]` is set before the button is clicked.
- The browser profile starts with no stored theme, so the first button name is `Switch to dark`.

- **Switch to dark.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive theme`. The drive clicks `Switch to dark`. `html` has `data-theme` `dark`.
- **Switch to light.** The same drive clicks `Switch to light`. `html` has `data-theme` `light`.
- **Proof.** The drive writes `evidence/theme/actions.txt`, `evidence/theme/aria-dark.txt`, `evidence/theme/dark.png`, `evidence/theme/aria.txt`, and `evidence/theme/page.png`. `page.png` is the light state after the second click.

## Gotchas

- The button name changes after each click. Click `Switch to dark` first.
- A stored `plainden-theme` from an earlier profile changes the first label. This helper uses a fresh browser context, so storage starts empty.
- The inline script does not follow the operating system theme. A dark OS still starts on `light` when storage is empty.
- Wait for hydration. The button does nothing useful before `data-hydrated` is true.
