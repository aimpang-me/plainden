Invoice and receipt share one engine in `tools/invoice`. The receipt folder is a shell with its own copy and preset.

Money is integer minor units. Tax is one percent of the subtotal, half up. A Canada page uses 5 percent. Stacked GST and PST are notes, not extra fields.

Free and paid branding happens in `view`. The saved row stores the draft, not the footer or the stamp. The free plan forces the plain template and drops the logo on the PDF.

Invoice and receipt PDF counts use two localStorage keys and add them on read, so the tools do not write one shared cell. The cap is 3.

`getCurrentUser` returns null, so every invoices route returns 401. `saveDocument` takes a user id. Tests insert an active invoice subscription and reload the same total. The form shows Sign in to save.

Clients are derived from saved rows. The form does not list them until an account can load those rows.

A blank form starts on 2026-10-20 with a due date 14 days later. `new Date()` during render blocks the static page.

`lib/registry/slugs.test.ts`, `lib/pages/resolve.test.ts`, `e2e/site.spec.ts`, `README.md`, and the verify skill named the invoice page as a placeholder. Those checks now point at the privacy placeholder, and the verify skill drives the real invoice and receipt.
