# Deploy prep

## Problem

Worker V has to leave a production header, an env list, and a Paddle review guide without editing auth, payments, or `proxy.ts`. F-b is writing those services on another branch. PLAN forbids a nonce CSP. The stack has no shared store for rate limits. Next.js says `proxy.ts` must not rely on shared globals.

## Usage

F8 imports `securityHeaders("production")` from `lib/security/csp.ts` and copies those headers onto the proxy response. Until a store exists, F8 calls `unenforcedRateLimit(rule)` from `lib/security/rateLimit.ts` and reads `rateLimitFlag.enforced`. A future store calls `decideRateLimit(rule, snapshot, nowMs)` and writes `next` itself.

The owner reads `ENV.md` for every variable name and `PADDLE-SETUP.md` for the four review URLs.

## Shape

The CSP is one table of directives rendered to a string. `scripts/deploy/security.test.ts` fails when `vercel.json` and `vercelConfigHeaders()` disagree. Mode is `"production" | "development"`, and the switch has a `never` default.

A rate decision is a union. Enforced decisions carry the window that produced them. The unenforced decision is a different type with `enforced: false` and `remaining: null`, so a caller cannot treat it as a counted limit. `rateRule` rejects non-integers at the boundary. `decideRateLimit` trusts a `RateRule`. There is no map in the module. Per separate-before-serializing-shared-state, the missing store stays outside this process instead of a lock around a local map.

## Synthesis decision

Cloud runners did not start. The Task tool returned "On-demand usage is required" for those calls. The sketch is one sequential pass on this session's model.

Candidate A is the base. The module owns the header string, and the rate limit is a pure window plus an unenforced flag. Candidate B put the header only in `vercel.json` and made `csp.ts` parse that file. That leaks the JSON shape into every caller and gives two ways to edit one policy. Candidate B also used an in-memory map. That map is the incorrect serverless option, so it was rejected. The pure window from a store-shaped snapshot was kept from the second sketch because tests can call it without a network.

## Tradeoffs accepted

We accept `'unsafe-inline'` in exchange for a static header that does not force dynamic pages.

We accept no PostHog or Sentry hosts in exchange for a policy that only names hosts the plan and the current pages actually need.

We accept an unenforced limiter in exchange for not shipping a counter that fails open across isolates while looking enforced.

## Alternatives considered

An in-memory token bucket loses because Next.js proxy docs say not to rely on globals, and a second isolate would not see the count. It hides nothing the caller can trust.

Vercel Firewall rate limits lose because workers cannot create a Vercel account or change dashboard settings, and `vercel.json` has no counter.

Adding Upstash loses because PLAN does not include that store, and this worker cannot edit `package.json`.

## Implementation reconciliation

The modules, `vercel.json`, and `scripts/deploy/security.test.ts` match this sketch. No signature changed during implementation.

## Open questions and risks

Will F8 use `/terms`, `/privacy`, and `/refund`, or different paths?

Which PostHog and Sentry hosts should the CSP allow once those scripts exist?

## Next implementation step

Write `lib/security/csp.ts`, `lib/security/rateLimit.ts`, and `vercel.json`, then pin the header string in a test.
