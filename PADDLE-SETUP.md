# Paddle Billing sandbox

The app calls Paddle Billing. Checkout opens the Paddle.js overlay from a server-created transaction. The webhook is `POST /api/paddle/webhook`. The signature header is `Paddle-Signature`. `PADDLE_WEBHOOK_SECRET` is the HMAC key.

Set `NEXT_PUBLIC_PADDLE_ENV` to `sandbox` until you switch the live account. The API base is `https://sandbox-api.paddle.com` unless that value is `production`.

`PADDLE_PRICE_MONTHLY` and `PADDLE_PRICE_YEARLY` are the two sandbox price ids. Every paid catalog row uses one of those ids for its interval. The cards still show $5 a month, $50 a year, $9 a month, and $90 a year. The lookup key in `custom_data` decides which tool the subscription unlocks. The sandbox charge is whatever those two price ids cost in Paddle.

`CHECKOUT_ENABLED=false` turns checkout and the portal off. In production, checkout and the portal also refuse to run when `NEXT_PUBLIC_SITE_URL` or `BETTER_AUTH_URL` is unset.

One Paddle customer id is stored on the user. A second open subscription is refused.

## Apply for Paddle approval

You do this in the Paddle dashboard. Sandbox checkout can run before the live domain is approved.

Paddle reviews four public pages. Submit `plainden.com` only after all four are live.

| Page | URL |
| --- | --- |
| Pricing | `https://plainden.com/pricing` |
| Terms | `https://plainden.com/terms` |
| Privacy | `https://plainden.com/privacy` |
| Refund | `https://plainden.com/refund` |

`/pricing` is already a route. `/terms`, `/privacy`, and `/refund` are not in this build. F8 adds those legal pages. Do not submit the domain while any of the three returns a placeholder or a 404.

## Before you submit

1. Open `https://plainden.com/pricing` and check the prices against `lib/pricing/catalog.ts`. A single tool is $5 per month and $50 per year. All tools is $9 per month and $90 per year. Paddle's catalog must show the same amounts.
2. Publish terms at `/terms`. Include this sentence from the Paddle seller handbook. "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns."
3. Publish a privacy notice at `/privacy` and a refund policy at `/refund`.
4. Confirm the homepage links to `support@plainden.com`. The footer already does. The seller handbook also asks for a phone number. This site does not have one. Add a number before you submit, or expect Paddle to ask for it.

## Submit the domain

These steps match the Paddle go-live checklist at `https://developer.paddle.com/build/set-up-checklist/`.

1. Create the Paddle account. Use a sandbox account while you are still building. Create the live account when you are ready for review. Sandbox domains are approved automatically. Live domains are not.
2. In the live dashboard, open Paddle, then My account, then Settings, then Website approval.
3. Submit `plainden.com`. Paddle has no API for this step. A subdomain such as `www.plainden.com` needs its own approval if checkout runs there.
4. Wait until Website approval shows the domain as approved. Live checkout stays blocked until then. You can check status under the same screen, or with the list checkout domains API.
5. After approval, open Paddle, then Checkout, then Checkout configuration. Set the default payment link to an `https` page on `plainden.com`. Do not use `localhost`.
6. Optional. On Website approval, verify the domain for Apple Pay if you want that extra step removed from Apple Pay checkout.

Paddle also checks that the pages are publicly reachable, that prices match the catalog, and that a contact email is reachable from the homepage. Source for that list is the "Prepare your website" item in the same go-live checklist.
