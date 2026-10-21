# Invoice generator

The invoice page turns a name, a client, and a line into a preview total and a PDF download.

## Sub-features

- `invoice-preview` shows the total and the free footer.
- `invoice-cap` allows three downloads, then shows the free monthly limit.

## How to get to it (user POV)

- On the landing page, choose `Invoice generator`.
- Open `http://127.0.0.1:3100/invoice-generator` directly.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Fill a line.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive invoice-generator`. The drive clears this origin's local storage, reloads, and fills Your name `Ada`, Client name `Bea`, Invoice number `100`, Description `Consulting`, Quantity `2`, and Unit price `10`.
- **Preview.** The Total row shows `$20.00`, and `made with plainden` is visible.
- **Cap.** Three clicks on `Download PDF` each produce a download. The fourth click sets the status to `The free plan includes 3 invoices a month.` and shows `See pricing`. A free visit also shows `Saving invoices is part of the paid plan.`
- **Proof.** The drive writes `evidence/invoice-generator/actions.txt`, `evidence/invoice-generator/aria.txt`, and `evidence/invoice-generator/page.png`.

## Gotchas

- The free save limit is already on the page, so `See pricing` is visible before the fourth download. Judge the cap by the status text.
- The page starts on the free plan, so `Save` stays hidden until `/api/entitlement` returns paid. `Load saved` while signed out says `Sign in to save.` Paid save is covered by Vitest.
