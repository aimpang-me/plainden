# V decisions

Rate limiting is not enforced. PLAN has no Redis, KV, or other shared store. Next.js documents `proxy.ts` as a place that must not rely on shared modules or globals, and a serverless isolate does not keep a count for the next isolate. An in-memory map would report a site-wide limit and would be wrong. `decideRateLimit` is a pure fixed window. It returns the next snapshot, and the caller would have to store that snapshot. Nothing in this repo stores it. `unenforcedRateLimit` is the function `proxy.ts` should call. `rateLimitFlag.sharedStore` is false. `rateLimitFlag.enforced` is false. This is the flag.

CSP is a static header. PLAN forbids a nonce because a nonce makes every page dynamic. `app/layout.tsx` injects an inline theme script, so `script-src` includes `'unsafe-inline'`. `script-src` includes `'wasm-unsafe-eval'`, and `worker-src` includes `blob:`, because PLAN requires that for ffmpeg.wasm. `media-src` includes `blob:` so a compressed video can play from a blob URL. Turnstile is allowed from `https://challenges.cloudflare.com` on `script-src`, `connect-src`, and `frame-src`. PostHog and Sentry hosts are omitted. No application code names them yet.

The development policy adds `'unsafe-eval'` because the Next.js CSP guide says the dev server needs it. Production does not add it. `vercel.json` carries the production headers only. `next dev` does not read `vercel.json`. On 2026-10-20 the verify server at `http://127.0.0.1:3100/pricing` returned HTTP 200 with no Content-Security-Policy header.

Paddle review URLs are `https://plainden.com/pricing`, `https://plainden.com/terms`, `https://plainden.com/privacy`, and `https://plainden.com/refund`. Only `/pricing` exists today. The other three paths are a default so F8 and the owner share one set of URLs.

No extra npm packages. The branch is `worker/V`.
