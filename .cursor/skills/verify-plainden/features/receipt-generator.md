# Receipt generator

The receipt page uses the invoice engine and adds a payment method and a PAID stamp.

## Sub-features

- `receipt-stamp` shows PAID after the method is chosen.
- `receipt-download` downloads one PDF.

## How to get to it (user POV)

- On the landing page, choose `Receipt generator`.
- Open `http://127.0.0.1:3100/receipt-generator` directly.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Fill a receipt.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive receipt-generator`. The drive fills Your name `Ada`, Client name `Bea`, Receipt number `R-9`, Description `Rent`, Quantity `1`, Unit price `10`, and selects Payment method `card`.
- **Stamp.** The Total row shows `$10.00`, and `PAID` is visible. `Download PDF` produces a file. A free visit also shows `Saving receipts is part of the paid plan.`
- **Proof.** The drive writes `evidence/receipt-generator/actions.txt`, `evidence/receipt-generator/aria.txt`, and `evidence/receipt-generator/page.png`.

## Gotchas

- Receipt downloads share the invoice monthly counter in this browser. Run this drive on a fresh storage state if a previous invoice drive already used the three free PDFs.
- The drive does not clear storage itself. Launch starts a new browser context, so the counter starts at zero.
