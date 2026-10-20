# Pricing

The pricing page lists every catalog price whose amount is above 0 cents. Each row shows the name, the formatted price, and the lookup key.

## Sub-features

- `pricing-tool` shows `Invoice generator monthly` at `$5/mo` with lookup key `plainden_invoice_month`.
- `pricing-bundle` shows `All tools monthly` at `$9/mo`.
- `pricing-annual` states that annual prices are 10 times the monthly price.

## How to get to it (user POV)

- Choose `Pricing` in the header.
- Open `http://127.0.0.1:3100/pricing`.
- On a blocked scaffold check, choose `See pricing`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open pricing.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive pricing`. The heading is `Pricing`.
- **Monthly prices.** The page shows `$5/mo`, `$9/mo`, and `plainden_invoice_month`.
- **Hidden scaffold price.** The page does not show `plainden_scaffold_month`. That lookup key is 0 cents.
- **Proof.** The drive writes `evidence/pricing/actions.txt`, `evidence/pricing/aria.txt`, and `evidence/pricing/page.png`.

## Gotchas

- `$5/mo` appears on more than one row. The proof checks that the text is present, and that `plainden_invoice_month` is present, so the invoice row is identified.
- Checkout buttons are not on this page in F-a. Do not look for a buy button.
