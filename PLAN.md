# plainden: build plan (plug and go)

One Next.js site, `plainden.com`, with 10 small tools at `/tool-name`. Free with limits, $5/mo to remove limits. Plain design. Speed over polish. Adding a tool = adding one folder.

**Every worker:** read this whole file, then do only your own job (section 5). Never ask the owner anything. Pick sensible defaults and log them in `notes/<your-id>/decisions.md`. Project folder: `C:\Users\PC-AIMPANG\Documents\Developments\plainden`.

## 1. Rules (apply to everyone)

1. Tools run in the browser. The server is only for accounts, payments, saved data, dynamic QR redirects, hosted policies.
2. Plain design: one layout, system font, one accent color, light and dark, no animation beyond hover.
3. Test mode only. No real keys, no real accounts, no live payments, no deploying. Agents cannot create accounts.
4. Never commit secrets. `.env.development` holds only test values (section 3).
5. Edit only the paths you own (section 5). Need a change elsewhere? Write it in `notes/<id>/requests.md` and work around it. Test sample files go in `tools/<x>/fixtures/` (you own it).
6. Never commit `package.json` changes or `package-lock.json` (except F). Install what you need with `npm install --no-save <pkg>@<version> ...` (this leaves `package.json` and the lockfile untouched, so rebase works). Put every library you need in ONE such command line at the top of `notes/<id>/deps.md`, with a why for each, and re-run that whole line after every rebase (npm prunes no-save packages when you install another one, so never run it in pieces). F adds them all and regenerates the lockfile at merge. Libraries used by more than one tool (`pdf-lib`, Playwright) are installed by F1 at a pinned version; use those, do not install your own copy.
7. Notes go only in `notes/<your-id>/`. Never edit another worker's notes or the shared `notes/` root.
8. Done = your check passes, `next build` and `eslint .` pass, and `notes/<id>/report.md` (10 lines max) says what works and what doesn't.
9. Branch `worker/<id>`, own worktree, commit often, rebase on `main` before you finish. Never merge to `main` yourself (except F).

## 2. Stack

| Part | Choice |
|---|---|
| App | Next.js 16, TypeScript, App Router, Tailwind. Lint with `eslint .` (no `next lint`). |
| Auth | Better Auth, email magic link. It creates its own user/session/account/verification tables. Do not use `@better-auth/stripe`. |
| Database | Postgres + Drizzle. Local and tests: PGlite. Production: Neon. |
| Payments | Stripe Checkout + Customer Portal + webhooks, behind `lib/payments/types.ts` so Paddle can be added later. |
| Email | Resend (production), file transport (dev) |
| Errors, analytics | Sentry, PostHog |
| Bot protection | Cloudflare Turnstile |
| Hosting | Vercel |
| Tests | Vitest (logic), Playwright (anything using canvas, files, wasm, or a full flow) |

## 3. Dev environment (no accounts needed)

Committed in `.env.development`:

| Need | Value |
|---|---|
| Database | PGlite, one per worktree |
| Email | `EMAIL_TRANSPORT=file`: magic links written to `.dev-mail/`, Playwright reads the link there |
| Turnstile | test keys `1x00000000000000000000AA` (site) and `1x0000000000000000000000000000000AA` (secret) |
| Stripe webhooks | signed fixtures via `stripe.webhooks.generateTestHeaderString` |
| Stripe checkout end-to-end | owner runs it later with real test keys; workers do not |
| Port | `PORT=3100+N` (F=3100, T1=3101 … T8=3108, S=3109, V=3110); `playwright.config` reads it |

## 4. The 10 tools

Slugs are real searches. Do not rename them. Price: per tool $5/mo, all-tools bundle $9/mo, annual = 10x monthly. Prices come from config (`priceLookupKey`), not hard-coded.

| # | Tool | Slugs | Free (runs in browser) | Paid |
|---|---|---|---|---|
| 1 | Invoice generator | `/invoice-generator` | Form, line items, tax, currency, live preview, PDF via pdf-lib. 3 PDFs/month with a small "made with plainden" footer. | No footer, logo upload (data URL, max 200 KB, stored in Postgres), save and reload invoices, client list, 3 templates |
| 2 | Privacy + terms generator | `/privacy-policy-generator`, `/terms-and-conditions-generator` | Questionnaire → text from clause templates. Copy as text/HTML with an attribution line. | PDF/Markdown download, hosted public link |
| 3 | PDF tools | `/merge-pdf`, `/split-pdf`, `/compress-pdf`, `/jpg-to-pdf` | pdf-lib, drag and drop. Up to 25 MB, 5 operations/day. | 200 MB, unlimited |
| 4 | QR code generator | `/qr-code-generator` | Static QR (URL, text, wifi, vCard), PNG and SVG, never expires. Lib: `qrcode`. | Dynamic QR via `/q/[id]` redirect, scan counts, 20 codes, center logo |
| 5 | Image tools | `/compress-image`, `/resize-image`, `/convert-image`, `/heic-to-jpg`, `/webp-to-png` | Target-size compress (100 KB, 200 KB), resize by px or %, convert jpg/png/webp/heic. 10 images/batch, 10 MB each. | 100 images/batch, 50 MB each |
| 6 | Video compressor | `/compress-video` | ffmpeg.wasm. Presets: Discord 8 MB, WhatsApp, 720p, 480p. Up to 100 MB. | Up to 500 MB |
| 7 | CSV / JSON / Excel converter | `/csv-to-json`, `/json-to-csv`, `/excel-to-csv` | Papaparse + SheetJS, preview table. 5 MB. | 100 MB, saved presets |
| 8 | Subtitle converter | `/srt-to-vtt`, `/srt-converter` | srt/vtt/ass round trips, timing shift, encoding fix. Own small parser. 1 file at a time. | Batch up to 50 files |
| 9 | Receipt generator | `/receipt-generator` | Same engine as tool 1 with a receipt template (paid stamp, payment method, receipt number) | Shares tool 1's plan |
| 10 | Cookie + refund policy generator | `/cookie-policy-generator`, `/refund-policy-generator` | Same engine as tool 2 with new clause sets | Shares tool 2's plan |

Decisions (so nobody asks):

- Free limits are soft counters in `localStorage`. Bypassing them is accepted. The server enforces only saved data, hosted policies, and dynamic QR.
- After a subscription lapses, dynamic QR codes and hosted policies keep working read-only. Creating or editing needs a plan.
- Legal tools are billed monthly (no "12 months" language).
- Legal output: show "not legal advice" on every output. Never write "GDPR/CCPA compliant". Fixed jurisdiction list: US, Canada, EU/UK, Australia, Other. A hosted policy only changes when the user re-publishes.
- Tools 9 and 10 share their parent tool's `entitlementKey` (receipt → invoice, cookie-refund → legal).
- Tools 9 and 10 are chosen because they reuse engines 1 and 2 and sit in the two segments where research found real willingness to pay.

Library notes (workers follow these):

- **Video:** `@ffmpeg/ffmpeg` with the single-thread `@ffmpeg/core` (no SharedArrayBuffer, so no COOP/COEP headers to break Turnstile or PostHog). Self-host the core files from `public/ffmpeg/` (default loads from a CDN). CSP needs `'wasm-unsafe-eval'` and `worker-src blob:`. Mount input with WORKERFS. Tests run in Playwright (0.12 does not run in Node).
- **Images, PDF compress:** need canvas, so tests run in Playwright, not jsdom. PDF compress re-encodes embedded JPEG (DCTDecode) images via canvas and leaves the rest alone. No size guarantee: the `/compress-pdf-to-4mb` page must say "up to" and not promise 4 MB.
- **Excel:** install SheetJS from `https://cdn.sheetjs.com/` (the npm `xlsx` package is frozen at 0.18.5 with known CVEs).
- **HEIC:** `heic-to` (or `heic2any`), loaded only on the HEIC route.

## 5. Workers

11 workers. F runs as five fresh sessions (F-a to F-e); every other worker is one session. Phase 1a first, then phase 2 in two batches, then phase 3. Models: F-a, F-b and F-e on Opus (contract, auth/payments, final integration); F-c, F-d and all other workers on Sonnet.

| ID | Model | Job | Owns (edit only these) | Done when |
|---|---|---|---|---|
| **F** | Opus (F-c, F-d: Sonnet) | Foundation | everything not owned by someone else below, plus `proxy.ts`, `app/[slug]/page.tsx`, `lib/entitlements`, `lib/payments/` (Stripe), `db/` | see steps F1–F8 |
| T1 | Sonnet | Invoice + receipt (tools 1, 9) | `tools/invoice/`, `tools/receipt/`, `app/api/invoices/` | Make an invoice, download PDF, paid user saves and reloads it; receipt renders from the same engine |
| T2 | Sonnet | Privacy/terms + cookie/refund (tools 2, 10) | `tools/legal/`, `tools/cookie-refund/`, `app/api/policies/`, `app/p/[id]/` | Every questionnaire answer appears in the output; hosted link works |
| T3 | Sonnet | PDF tools | `tools/pdf/` | Merge, split, compress, jpg-to-pdf pass on sample files; limits enforced |
| T4 | Sonnet | QR | `tools/qr/`, `app/api/qr/`, `app/q/[id]/` | Dynamic QR redirects and counts scans |
| T5 | Sonnet | Image tools | `tools/image/` | Target-size compress lands within 10% of target on sample images |
| T6 | Sonnet | Video | `tools/video/`, `public/ffmpeg/` | A sample clip compresses under the preset size, in Playwright |
| T7 | Sonnet | Data converters | `tools/data/` | Sample file round trips |
| T8 | Sonnet | Subtitles | `tools/subtitles/` | srt↔vtt round trip with timing shift |
| S | Sonnet | SEO | `lib/seo/` (sitemap, JSON-LD, meta, OG image template, long-tail renderer) | Sitemap lists every page. (The Lighthouse SEO 95+ check on 3 sample pages runs in phase 3, after merge.) |
| V | Sonnet | Deploy prep | `vercel.json`, `ENV.md`, `lib/security/{csp,rateLimit}.ts`, `scripts/deploy/`, `PADDLE-SETUP.md` | `next build` passes; ENV.md lists every variable; PADDLE-SETUP.md has the exact steps and the 4 pages Paddle reviews (pricing, terms, privacy, refund) |

**Phase 1a: F-a only (goes first, must finish before phase 2).** F1–F4 below, merged to `main`, with `CONTRACT.md` written.

**Phase 2: parallel, two batches.**
- Batch A starts when 1a is on `main`: T1, T3, T4 (wave 1 tools), S, V. F-b (fresh session) does F5–F7 at the same time and merges them to `main` before F-c merges batch A.
- Batch B starts after F-c has merged batch A (so it builds on real auth and entitlements, not stubs): T2, T5, T6, T7, T8. This keeps the first build small and lets wave 1 prove the pipeline.

**Phase 3: F only, three fresh sessions.** Each reads `notes/F/` and the workers' `report.md` and `deps.md` files.
- **F-c:** add batch A's libraries to `package.json`, regenerate the lockfile, merge in this order with build + tests after each: V, S, T1, T3, T4.
- **F-d:** (after batch B is done) same for T2, T5, T6, T7, T8, then run `drizzle-kit generate` (the first point where every `tools/<x>/schema.ts` exists), check the migration applies on PGlite, and run the Lighthouse SEO check (95+ on 3 sample pages).
- **F-e:** F8.

### F's steps

| Step | Work | Done when |
|---|---|---|
| F1 | Scaffold, git init, lint, Vitest, Playwright, shared libraries (`pdf-lib` and any other used by 2+ tools, pinned), `.env.development`, `.env.example`, port config, `notes/` | `next build` and tests pass on an empty app |
| F2 | Tool registry and `CONTRACT.md` (below), tool page template, landing, layout, nav, light/dark, UI primitives | A dummy tool renders at its slug |
| F3 | **All** database tables: Better Auth's own, plus subscriptions, usage, saved_invoices, qr_codes, policy_docs. Tool-specific extras go in `tools/<x>/schema.ts` (drizzle.config globs these). Only F runs `drizzle-kit generate` (in F-d, after every schema file is merged). Until then, workers apply schemas to PGlite directly in tests and dev. | Schema applies on PGlite |
| F4 | Stubs: `getCurrentUser()`, `getEntitlement`, `checkLimit`, `useEntitlement()`, `<UpgradePrompt>`, payments interface | Tool workers can import all of them |
| F5 | Real auth: magic link, Turnstile, account page | Playwright: sign in via `.dev-mail/` link |
| F6 | Real entitlements and usage counters | Unit tests: free blocks, paid passes, counters reset |
| F7 | Stripe: price creation script (`scripts/stripe/`), checkout, portal, webhook handler | Signed fixtures: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed` update the subscription |
| F8 | Integration: merge workers, emails (welcome, receipt, payment failed, cancel), legal pages (privacy, terms, refund), cookie banner (decline by default), analytics events, Sentry, `/api/health`, kill switch (`CHECKOUT_ENABLED`, `TOOLS_DISABLED`), proxy.ts using V's CSP and rate limits, axe a11y pass, 375 px pass, `REPORT.md` | All builds green; report lists what works, known gaps, owner checklist |

### Contract (F writes it in F2/F4 as `CONTRACT.md`, never changes it after)

- `ToolConfig`: `{ id, name, slugs[], title, description, entitlementKey, priceLookupKey, limits: { free, paid }, seoPages[] }`
- `ToolProps`: `{ slug, preset? }`. A tool exports `default function Tool(props: ToolProps)`.
- `copy.ts` exports `{ headline, steps[], faq[] (6+), longTail: { slug, title, intro, preset?, faq[] }[] }` (5 long-tail entries per tool at build; expand to 20 only for tools that pass the Day 30 check).
- Registry: `scripts/gen-registry.ts` runs on predev/prebuild and writes the gitignored `tools/registry.generated.ts`. F owns the only `app/[slug]/page.tsx`. A test fails on duplicate slugs.
- `Subject = { userId } | { deviceId }`; `LimitKind` enum (`fileSize`, `batchCount`, `perDay`, `perMonth`, `savedItems`).
- `getEntitlement(subject, entitlementKey)`, `checkLimit(subject, entitlementKey, kind, amount)`, client `useEntitlement()`, `<UpgradePrompt reason />`, `getCurrentUser()`, `db` (Drizzle).
- Payments: `lib/payments/types.ts` with `createCheckout`, `createPortal`, `handleWebhook`.
- UI primitives in `components/ui/`: Button, Input, Select, FileDrop, Card.

## 6. Shared features (F, S, V build these; tool workers do not)

Landing page, tool page template (headline, tool, steps, FAQ, related tools), account and usage pages, pricing page, checkout, support link `support@plainden.com`, transactional emails, privacy/terms/refund pages, sitemap/robots/titles/JSON-LD (SoftwareApplication, FAQPage, BreadcrumbList)/canonical URLs/OG images, 5 long-tail pages per tool at build (20 after Day 30 for live tools), analytics events (`tool_opened`, `tool_used`, `limit_hit`, `checkout_started`, `checkout_completed`), Sentry, health check, kill switch, cookie banner. CSP is set as a plain header (not nonce-based, which forces every page dynamic).

Long-tail seeds: `/compress-pdf-to-4mb`, `/compress-image-to-100kb`, `/compress-image-to-200kb`, `/resize-image-to-20kb`, `/compress-video-for-discord`, `/invoice-generator-canada`, `/invoice-template-google-docs`, `/invoice-template-word`, `/invoice-template-excel`, `/qr-code-generator-no-expiration`, `/privacy-policy-generator-for-app`, `/privacy-policy-generator-for-meta-ads`, `/privacy-policy-generator-for-blogger`. Tool workers write their own 5 entries in `copy.ts`: unique intro, a working preset, a FAQ, no duplicated body copy.

## 6b. Release waves (build all 10 together, go public in 3 waves)

| Wave | Tools | Gate before it goes live |
|---|---|---|
| 1 | Invoice (1), PDF (3), QR (4) | Section 9 gaps done for these tools; owner tasks 1–4 done |
| 2 | Image (5), Privacy + terms (2), Receipt (9) | Wave 1 check: pages indexed, impressions, any checkout clicks. A person has read the legal output. |
| 3 | Video (6), CSV/JSON/Excel (7), Subtitles (8), Cookie + refund (10) | Wave 2 check passed. A person has read cookie/refund output. |

- Wait 1–2 weeks between waves.
- Unreleased tools stay built but hidden: listed in `TOOLS_DISABLED`, excluded from nav, sitemap and landing page, and `noindex`.
- Long-tail pages are indexed only after they pass the content rule in section 9.

## 7. Owner tasks (agents cannot do these; nothing waits on them)

1. Register `plainden.com` at Cloudflare Registrar (about $10.46/yr). Re-check it is free first.
2. Create accounts and paste keys into Vercel env vars (`ENV.md` lists them): Vercel Pro, Neon, Stripe, Resend, Sentry, PostHog, Turnstile.
3. Create `support@plainden.com` forwarding to your inbox.
4. Run the Stripe test-key checkout once end to end, then switch to live keys and set the webhook URL.
5. Follow `PADDLE-SETUP.md` to apply for Paddle approval (backup processor).
6. Claim handle `plainden` on GitHub, YouTube, npm, Instagram (free as of Oct 2026).
7. Have the legal pages read once by a person before going live.

## 8. Cost and kill rules (owner only)

- Running cost $23–43/mo. Breakeven about $30–55 MRR across the site.
- Day 30: pages indexed, impressions rising, any checkout clicks. A tool failing all three gets no more work.
- Day 90: under $50 MRR total = stop. $50–300 = keep. $300+ for 2 months = polish design. $500+ = double down. $1k+ for 2 months = move that tool to its own domain.

## 9. Known gaps (tackle when ready to ship all 10; workers ignore this section)

| Gap | What to do at ship time |
|---|---|
| Search Console and Bing not set up | Verify the domain, submit `sitemap.xml` to Google Search Console and Bing Webmaster Tools |
| No backlinks | Plan a small push per tool: directories, Product Hunt, Reddit/forum answers, "free tools" lists |
| Keyword volumes unmeasured | Authorize Ahrefs or Similarweb in claude.ai connector settings, then check the long-tail pages and cut or merge those with no searches |
| Thin-content risk on about 50 templated pages (more once expanded) | Rule to enforce: at least 150 unique words plus a working tool on each page. Audit a sample before launch; noindex pages that fail |
| Only the Lighthouse SEO score is checked | Add a Core Web Vitals check (speed, layout shift) on one page per tool |
| Merge of 11 branches may leave fixes | Budget a cleanup pass after F8 |
| Real Stripe test checkout never run by workers | Owner runs it once end to end, then switches to live |
| Tools not judged by a human | Use each tool yourself once on desktop and phone; list rough edges |
| Legal pages and generators not lawyer-reviewed | Have a person read them; keep the "not legal advice" notice |
| Soft free limits can be bypassed | Accepted for now; revisit if abuse shows up in analytics |
| X and TikTok handles unchecked | Claim `plainden` manually if free |
| Search demand and AI Overviews may cut clicks | The Day 30 and Day 90 checks in section 8 decide what survives |

## 10. Not in this plan

Mobile apps, desktop apps, browser extensions, a domain per tool, AI support bots, design polish, French translation, search-volume validation (needs Ahrefs or Similarweb).

## 11. Launch prompts (one per worker)

Use this text, filling in the ID. Nothing else is needed.

> You are worker **<ID>** on the plainden build. Read `PLAN.md` (repo root) fully. Do only the job and owned paths listed for **<ID>** in section 5, following sections 1–4. Phase 2 workers start only after F's phase 1a is on `main`; branch from `main`. For F: your session is F-a (F1–F4), F-b (F5–F7), F-c, F-d or F-e (see section 5); do only that part, read `notes/F/` for what earlier F sessions left, and write `notes/F/report-<a|b|c|d|e>.md`. Do not ask questions; log defaults in `notes/<ID>/decisions.md`; finish with `notes/<ID>/report.md` (10 lines max).
