# Legal tools design

Base is the derived public id. Grafted in the slot clause and the download plan check. Rejected a form-minted id and a localStorage id.

## Usage

The form calls `questionnaire`, `draft`, and `toPdf`. The route calls `publish` and `readOwned`. The public page calls `readPublished`.

```tsx
const entitlement = useEntitlement(config.entitlementKey);
const form = questionnaire(slug, preset);
const result = draft({ kind: form.kind, answers }, entitlement.plan);
```

```ts
const user = await getCurrentUser();
if (!user) return Response.json({ error: "sign in required" }, { status: 401 });
return toPolicyResponse(await publish(user.id, await request.json().catch(() => null)));
```

```tsx
const published = await readPublished(id);
if (!published) notFound();
return <article className="whitespace-pre-wrap">{published.text}</article>;
```

## Shape

One clause catalog in `tools/legal/catalog.ts`. A kind is an ordered list of slots. A slot body is `lead + answer + trail`. Nothing else inserts an answer. `draft` and `hostedDocument` are the only callers of that walker. Clause types stay unexported.

`publicId` and row `id` are the same value. It is the first 32 hex characters of sha256 of `plainden-policy:v1:${userId}:${kind}`. The formula is frozen. A refresh republishes that path. `readPublished` does not check the plan and does not require a uuid.

`publish` counts `policy_docs` rows for the user. An existing id uses that count. A new id uses the count plus 1. It passes the count to `checkLimit({ userId }, "legal", LimitKind.savedItems, amount)`. A refusal writes nothing. The same body does not write again. A changed body updates `body`, `kind`, `publishedAt`, and `updatedAt`, and keeps `publicId`. There is no delete.

Free text and HTML end with `made with plainden`. Every projection includes `This draft is not legal advice.` Markdown and PDF omit the attribution line. `toPdf(raw, plan)` and the markdown branch return a plan error when the plan is free, and they do not call `pdf-lib` in that case. A character `pdf-lib` cannot draw fails the PDF. The function does not replace the character.

Both configs import `legalLimits`, which is `{ free: { savedItems: 0 }, paid: {} }`.

## Modules

`tools/legal/catalog.ts` owns slots, tails, `NOTICE`, `ATTRIBUTION`, `legalLimits`, `questionnaire`, `draft`, and `hostedDocument`.

`tools/legal/pdf.ts` owns `toPdf`. It calls `hostedDocument` and `pdf-lib` 1.17.1.

`tools/legal/publish.ts` owns every write and `readPublished`, `readOwned`, and `toPolicyResponse`.

`tools/legal/form.tsx` owns the controls. `tools/legal/tool.tsx` renders that form. `tools/cookie-refund/tool.tsx` re-exports it.

`tools/legal/config.ts` and `tools/legal/copy.ts` project the catalog. Cookie-refund config and copy do the same for the other two kinds. `seoPages` is the long-tail slugs from the catalog.

`notes/T2/requests.md` lists the four tests this worker does not edit.

## Catalog

Shared slots, in order, on every kind. `businessName` label `Business name`, lead `This service is run by `, trail `.`. `contactEmail` label `Contact email`, lead `Contact `, trail ` about this policy.`. `website` label `Website`, lead `The website is `, trail `.`. `jurisdiction` label `Jurisdiction`, control `jurisdiction`, lead `The operator points at `, trail ` for this draft.`.

Privacy title `Privacy policy`. Then `dataCollected` label `Data collected`, lead `The data collected is `, trail `.`. `purpose` label `Purpose`, lead `The purpose is `, trail `.`. `retention` label `Retention`, lead `The data is kept for `, trail `.`.

Terms title `Terms and conditions`. Then `product` label `Product`, lead `These terms cover `, trail `.`. `acceptableUse` label `Acceptable use`, lead `Acceptable use is `, trail `.`. `termination` label `Termination`, lead `The agreement ends when `, trail `.`.

Cookie title `Cookie policy`. Then `cookieName` label `Cookie name`, lead `The cookie named in this draft is `, trail `.`. `purpose` label `Purpose`, lead `The purpose is `, trail `.`. `duration` label `Duration`, lead `The cookie lasts `, trail `.`.

Refund title `Refund policy`. Then `window` label `Refund window`, lead `The refund window is `, trail `.`. `method` label `Refund method`, lead `Refunds are paid by `, trail `.`. `exceptions` label `Exceptions`, lead `The exceptions are `, trail `.`.

Trimmed empty answers are rejected. Text over 400 characters is rejected. Jurisdiction must be `US`, `Canada`, `EU/UK`, `Australia`, or `Other`. The trimmed answer is what appears.

Legal long-tail slugs, preset equal to the slug, each with a full answer map: `privacy-policy-generator-for-app`, `privacy-policy-generator-for-meta-ads`, `privacy-policy-generator-for-blogger`, `terms-and-conditions-generator-for-saas`, `terms-and-conditions-generator-for-marketplace`.

Cookie and refund long-tail slugs: `cookie-policy-generator-for-shop`, `cookie-policy-generator-for-analytics`, `cookie-policy-generator-for-app`, `refund-policy-generator-for-digital-goods`, `refund-policy-generator-for-services`.

Authored leads, trails, titles, intros, the notice, and the attribution line must not contain `GDPR` or `CCPA`. A user answer may contain those letters and still appears.

## Checks

`tools/legal/policy.test.ts` asserts that every tail answer is a substring of the paid text, the hosted text, and the decoded HTML. The notice is present. Attribution appears only on free text and free HTML. Free markdown is a plan error and does not include the file text. An answer `A & B <C>` stays raw in the text and is escaped in the HTML.

`tools/legal/publish.test.ts` uses a temp `PGLITE_DATA_DIR` the way `tools/invoice/save.test.ts` does. A free user gets `free savedItems allows 0` and no row. A paid user with `entitlementKey` `legal` gets one row whose `publicId` matches the formula. The same body does not change `updatedAt`. A new answer keeps `publicId`. After the subscription is `canceled`, `readPublished` still returns the body and a further publish does not change it.

`app/api/policies/route.test.ts` asserts POST without a user is 401 `{ error: "sign in required" }`.
