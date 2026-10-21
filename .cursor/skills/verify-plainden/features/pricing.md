# Pricing

The pricing page shows three plans. Free lists the public limits. One tool is `$5/mo` or `$50/yr` and includes a tool picker. All tools is `$9/mo` or `$90/yr` and is marked Recommended. Annual billing says two months free. Lookup keys stay in hidden checkout fields.

## Sub-features

- `pricing-free` shows the free limits, including 3 invoices or receipts a month.
- `pricing-tool` shows One tool at `$5/mo`. The default hidden checkout field is `plainden_invoice_month`.
- `pricing-bundle` shows All tools at `$9/mo` with the Recommended label.
- `pricing-annual` shows two months free, then `$50/yr` and `$90/yr` after Annual is selected.

## How to get to it (user POV)

- Choose `Pricing` in the header.
- Open `http://127.0.0.1:3100/pricing`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Open pricing.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive pricing`. The heading is `Pricing`.
- **Monthly prices.** The page shows `$5/mo` and `$9/mo`. The visible text does not include `plainden_`.
- **Checkout keys.** The One tool form starts at `plainden_invoice_month`. Annual plus QR code generator sets it to `plainden_qr_year`.
- **Proof.** The drive writes `evidence/pricing/actions.txt`, `evidence/pricing/aria.txt`, and `evidence/pricing/page.png`.

## Gotchas

- `$5/mo` can also appear in the page introduction. The proof checks that the text is present, and that the hidden invoice key is the checkout value.
- Each paid plan has a Checkout button and the page has Open billing portal. The drive checks that those buttons exist. Do not click them. Stripe is not configured for this server.
- Receipt shares the invoice plan. Cookie and refund share the legal plan. They are not separate prices in the picker.
