# Privacy policy

The privacy, terms, cookie, and refund questionnaires fill one draft. Every answer shows in the text. A free visitor cannot download Markdown.

## Sub-features

- `privacy-answers` shows a typed business name and the not-legal-advice notice.
- `privacy-download` blocks Markdown on the free plan and links to pricing.
- `policy-missing` returns 404 for an unknown hosted id.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/privacy-policy-generator-for-app`.
- The cookie sample is `http://127.0.0.1:3100/cookie-policy-generator-for-shop`.
- The refund sample is `http://127.0.0.1:3100/refund-policy-generator-for-services`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Shared samples.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive privacy-policy`. The drive opens the cookie sample and sees `The cookie named in this draft is cart_id.` It opens the refund sample and sees `Refunds are paid by bank transfer.`
- **Typed answer.** On the app privacy sample, replace `Business name` with `Ada Studio`. The draft shows `This service is run by Ada Studio.` and `This draft is not legal advice.`
- **Free download.** Click `Download Markdown`. The status is `Markdown and PDF need the legal plan.` The link `See pricing` is visible.
- **Missing host.** `GET /p/not-a-policy` returns 404.
- **Proof.** The drive writes `evidence/privacy-policy/actions.txt`, `evidence/privacy-policy/aria.txt`, and `evidence/privacy-policy/page.png`.

## Gotchas

- The hosted create path needs a signed-in legal plan. This drive does not sign in. The publish tests cover the stable public id.
- The first paint can be the free plan even for a signed-in paid user, until the entitlement request returns.
