# plainden contract

This file is the reference later workers import. Types live in `lib/contract/types.ts` and `lib/contract/limits.ts`.

## Tool module

A built tool is a directory `tools/<id>/` with three files.

`config.ts` exports `config: ToolConfig`.

```ts
type ToolConfig = {
  id: string;
  name: string;
  slugs: readonly string[];
  title: string;
  description: string;
  entitlementKey: string;
  priceLookupKey: string;
  limits: { free: LimitTable; paid: LimitTable };
  seoPages: readonly string[];
};
```

`LimitTable` is `Partial<Record<LimitKind, number>>`. A missing kind means that plan has no cap for that kind. `amount` on a check is the size of this request. It is not a stored counter.

`tool.tsx` exports `default function Tool(props: ToolProps)`.

```ts
type ToolProps = { slug: string; preset?: string };
```

`copy.ts` exports `copy: ToolCopy`.

```ts
type ToolCopy = {
  headline: string;
  steps: readonly string[];
  faq: readonly Faq[];
  longTail: readonly LongTailPage[];
};

type Faq = { question: string; answer: string };

type LongTailPage = {
  slug: string;
  title: string;
  intro: string;
  preset?: string;
  faq: readonly Faq[];
};
```

`faq` has at least 6 entries. `longTail` has at least 5 entries. Each long tail slug is its own route.

`priceLookupKey` must exist in `lib/pricing/catalog.ts`. Prices are cents. A tool monthly price is 500 ($5/mo). The all tools monthly price is 900 ($9/mo). Annual is 10 times monthly. Lookup keys are `plainden_<entitlement>_month` and `plainden_<entitlement>_year`. The bundle key stem is `plainden_all`.

Receipt uses entitlement `invoice` and lookup key `plainden_invoice_month`. Cookie and refund use entitlement `legal` and lookup key `plainden_legal_month`.

## Registry

`scripts/gen-registry.ts` runs from `predev`, `prebuild`, and `postinstall`. It also runs when `next.config.ts` loads. It writes `tools/registry.generated.ts`. That file is gitignored.

The generator loads every `tools/<id>/config.ts` that exists. It rejects a folder id that does not match `config.id`, a `priceLookupKey` missing from the catalog, and any duplicate among primary slugs and long tail slugs. `seoPages` may repeat a long tail slug. A built tool may not take a primary slug owned by a different planned tool in `lib/catalog/planned.ts`.

`lib/registry/slugs.test.ts` fails the suite when two tools claim one slug.

`app/[slug]/page.tsx` is the only tool route. It calls `resolveSlug` from `lib/pages/resolve.ts`. A registry tool wins when the slug matches. Otherwise a planned tool renders the placeholder `This tool is not built yet.` Unknown slugs call `notFound()`.

The scaffold tool id is `scaffold`. Its slug is `scaffold-check`. It is not in the planned catalog and the landing page does not link to it. Remove `tools/scaffold/` before public launch.

## Subject and limits

```ts
type Subject = { userId: string; deviceId?: never } | { deviceId: string; userId?: never };
```

`LimitKind` in `lib/contract/limits.ts` is a const object, not a TypeScript enum, so Node can load it with type stripping. The values are `fileSize`, `batchCount`, `perDay`, `perMonth`, and `savedItems`.

## Entitlements

```ts
getEntitlement(subject: Subject, entitlementKey: string): Promise<Entitlement>
checkLimit(subject: Subject, entitlementKey: string, kind: LimitKind, amount: number): Promise<LimitDecision>
useEntitlement(entitlementKey: string): Entitlement
decideLimit(input: { plan: "free" | "paid"; limits: { free: LimitTable; paid: LimitTable }; kind: LimitKind; amount: number }): LimitDecision
```

`Entitlement` is `{ entitlementKey: string; plan: "free" | "paid" }`.

`LimitDecision` is `{ ok: true }` or `{ ok: false; plan; kind; limit; reason }`. `kind` is a `LimitKind`, or `"unknown"` when the entitlement key is not registered. `reason` stays the internal string `<plan> <kind> allows <limit>`. Pages and API messages that a visitor reads use `visitorLimitCopy` instead of `reason`.

Import `checkLimit`, `getEntitlement`, and `decideLimit` from `lib/entitlements`. Import `useEntitlement` from `lib/entitlements/use-entitlement`. That module is a client module.

`getEntitlement` treats every device subject as free and does not open the database. A user subject is paid when `subscriptions` has `status` `active` or `trialing` for that `entitlementKey` or for `all`. `canceled` stays free.

`checkLimit` reads limits from the registry, then from `lib/catalog/planned.ts`. An unknown entitlement returns `{ ok: false, plan: "free", kind: "unknown", limit: 0, reason: "unknown entitlement <key>" }`. Over the cap, `reason` is `<plan> <kind> allows <limit>` and `kind` is the limit kind. `savedItems` checks the cap and does not write `usage`. Other kinds increment `usage` when the decision is allowed. This signature stays. Visitor text comes from `lib/entitlements/visitor-copy.ts`.

`useEntitlement` returns `status: "loading"` until `/api/entitlement` responds, then `status: "ready"` with that plan. A signed-out response is the free plan. Callers must not apply a free cap while `status` is `loading`.

`components/upgrade-prompt.tsx` exports `UpgradePrompt`. The prop is `reason: string`. The component prints that string and a link named `See pricing` to `/pricing`.

## Auth

`lib/auth/get-current-user.ts` exports `getCurrentUser(): Promise<CurrentUser | null>`. `CurrentUser` is `{ id, email, name }`. It returns the signed-in user, or `null` when there is no session.

## Database

`lib/db/client.ts` exports `getDb(): Promise<AppDatabase>`. There is no sync `db` export. `getDb` reads `process.env.PGLITE_DATA_DIR` only when called. The default directory is `.data/pglite`. The value `memory` opens an in memory PGlite. The handle is cached per directory.

`lib/db/apply.ts` creates tables with `CREATE TABLE IF NOT EXISTS` from the Drizzle table config. `drizzle-kit generate` is not run in this phase. F-d owns the first migration.

`db/schema.ts` exports `schema`, `tables`, and the tables `user`, `session`, `account`, `verification`, `subscription`, `usage`, `savedInvoice`, `qrCode`, and `policyDoc`. SQL names are `user`, `session`, `account`, `verification`, `subscriptions`, `usage`, `saved_invoices`, `qr_codes`, and `policy_docs`. Column names match Better Auth camelCase field names. `usage` has check `usage_one_subject`: exactly one of `userId` or `deviceId` is set.

`drizzle.config.ts` globs `./db/schema.ts` and `./tools/*/schema.ts` and writes `./db/migrations`.

Server modules under `lib/db`, `lib/payments`, and `lib/auth` must not read `process.env` at module scope. `scripts/check-lazy-env.ts` flags a read at brace depth 0.

## Payments

`lib/payments/types.ts` exports the `Payments` interface.

```ts
createCheckout(input: CheckoutInput): Promise<CheckoutResult>
createPortal(input: PortalInput): Promise<PortalResult>
handleWebhook(input: WebhookInput): Promise<WebhookResult>
```

`CheckoutInput` is `{ priceLookupKey, subject, successPath, cancelPath }`. `CheckoutResult` and `PortalResult` are `{ url }`. `PortalInput` is `{ subject, returnPath }`. `WebhookInput` is `{ rawBody, signature }`. `WebhookResult` is `{ handled: true }`.

`lib/payments/index.ts` exports `payments`, `createCheckout`, `createPortal`, `handleWebhook`, and `PaymentsNotConfigured`. Checkout, portal, and webhook verification call Stripe. They throw `PaymentsNotConfigured` with message `Payments are not configured` when the Stripe secret for that call is missing.

## UI primitives

`components/ui/` exports `Button`, `Input`, `Select`, `FileDrop`, and `Card` from `button.tsx`, `input.tsx`, `select.tsx`, `file-drop.tsx`, and `card.tsx`.

## Theme

`html` has `data-theme` `light` or `dark`. The storage key is `plainden-theme`. The inline script in `app/layout.tsx` applies a stored `light` or `dark` value only. It does not follow the system color scheme. The header button is named `Switch to dark` or `Switch to light`.
