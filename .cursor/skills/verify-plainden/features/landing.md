# Landing

The landing page lists every planned tool and states the monthly tool price and the bundle price. The footer mailto is part of this page.

## Sub-features

- `landing-prices` shows `$5/mo` for one tool and `$9/mo` for every tool.
- `landing-list` links each planned tool by its first slug.
- `landing-support` exposes `support@plainden.com`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/`.
- Choose the header link `plainden` from any page.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open the landing page.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive landing`. The heading is `Small tools that run in the browser`. The page shows `$5/mo` and `$9/mo`.
- **Support link.** The same drive checks the link `support@plainden.com` and `href` `mailto:support@plainden.com`.
- **Tool link.** The same drive checks that the link `Invoice generator` is visible. Choosing it is covered by `planned-tool`.
- **Proof.** The drive writes `evidence/landing/actions.txt`, `evidence/landing/aria.txt`, and `evidence/landing/page.png`.

## Gotchas

- Wait for `html[data-hydrated="true"]` before clicking. A click before hydration reloads the page.
- The scaffold tool is not in this list. Do not treat a missing `Scaffold check` link as a failure.
- Prices come from the catalog. A change to `plainden_invoice_month` changes the sentence on this page.
