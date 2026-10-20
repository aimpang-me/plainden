# Sign in

The account page sends a magic link to an email address. Opening that link from `.dev-mail` shows the same address and a sign out button.

## Sub-features

- `sign-in-request` accepts an email and says to check email.
- `sign-in-verify` opens the file mail link and lands on `/account` signed in.
- `sign-in-session` shows the address and the button `Sign out`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/account` or click `Sign in` in the header.
- The signed out page shows an email field and the button `Email me a sign-in link`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.
- `html[data-hydrated="true"]` is set before the form is submitted.
- `.env.development` sets `EMAIL_TRANSPORT=file` and the Turnstile test site key.

- **Request a link.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive sign-in`. The drive fills Email with a unique address and clicks `Email me a sign-in link`. The status reads `Check your email for a sign-in link.`
- **Open the link.** The same drive reads `.dev-mail` and opens the message URL. The page URL path is `/account` and the query has no `error`.
- **Proof.** The address is visible and the button `Sign out` is visible. The drive writes `evidence/sign-in/actions.txt`, `evidence/sign-in/aria.txt`, and `evidence/sign-in/page.png`.

## Gotchas

- Submit before hydration uses the browser form submit and does not write `.dev-mail`. Wait for `data-hydrated`.
- The dev mail directory is `.dev-mail`. The drive deletes it at the start so it reads the message it just requested.
- The Turnstile test site key pre-seeds a dummy token. A production site key would wait for the widget.
- The link is single use. A second open of the same URL returns to the signed out form.
