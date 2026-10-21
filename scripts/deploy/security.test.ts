import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { contentSecurityPolicy, vercelConfigHeaders } from "../../lib/security/csp";
import { decideRateLimit, rateLimitFlag, rateRule, unenforcedRateLimit } from "../../lib/security/rateLimit";

const paddleScript = "https://cdn.paddle.com";
const paddleConnect =
  "https://cdn.paddle.com https://sandbox-api.paddle.com https://api.paddle.com https://sandbox-checkout-service.paddle.com https://checkout-service.paddle.com";
const paddleFrames = "https://sandbox-buy.paddle.com https://buy.paddle.com";

const productionPolicy =
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://challenges.cloudflare.com ${paddleScript}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob: https://challenges.cloudflare.com ${paddleConnect}; media-src 'self' blob:; worker-src 'self' blob:; frame-src https://challenges.cloudflare.com ${paddleFrames}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;

const developmentPolicy =
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://challenges.cloudflare.com ${paddleScript}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob: https://challenges.cloudflare.com ${paddleConnect}; media-src 'self' blob:; worker-src 'self' blob:; frame-src https://challenges.cloudflare.com ${paddleFrames}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;

test("production CSP is the static header browsers get on Vercel", () => {
  expect(contentSecurityPolicy("production")).toBe(productionPolicy);
  expect(contentSecurityPolicy()).toBe(productionPolicy);
});

test("development CSP adds unsafe-eval for the Next dev server", () => {
  expect(contentSecurityPolicy("development")).toBe(developmentPolicy);
});

test("vercel.json repeats the production security headers", () => {
  const parsed: unknown = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(parsed).toEqual({ framework: "nextjs", headers: vercelConfigHeaders() });
});

test("a fixed window allows the limit, then denies until the window ends", () => {
  const rule = rateRule(2, 60_000);
  const first = decideRateLimit(rule, undefined, 1_000);
  expect(first.decision).toEqual({
    allowed: true,
    enforced: true,
    limit: 2,
    remaining: 1,
    windowStartedAtMs: 1_000,
    count: 1,
  });
  const second = decideRateLimit(rule, first.next, 2_000);
  expect(second.decision).toEqual({
    allowed: true,
    enforced: true,
    limit: 2,
    remaining: 0,
    windowStartedAtMs: 1_000,
    count: 2,
  });
  const third = decideRateLimit(rule, second.next, 3_000);
  expect(third.decision).toEqual({
    allowed: false,
    enforced: true,
    limit: 2,
    remaining: 0,
    retryAfterMs: 58_000,
    windowStartedAtMs: 1_000,
    count: 2,
  });
  expect(third.next).toEqual({ count: 2, windowStartedAtMs: 1_000 });
  const later = decideRateLimit(rule, third.next, 61_000);
  expect(later.decision).toEqual({
    allowed: true,
    enforced: true,
    limit: 2,
    remaining: 1,
    windowStartedAtMs: 61_000,
    count: 1,
  });
});

test("the same snapshot returns the same decision", () => {
  const rule = rateRule(1, 10_000);
  const first = decideRateLimit(rule, undefined, 500);
  const again = decideRateLimit(rule, undefined, 500);
  expect(again.decision).toEqual(first.decision);
});

test("a limit of zero denies for the whole window", () => {
  const blocked = decideRateLimit(rateRule(0, 10_000), undefined, 5_000);
  expect(blocked.decision).toEqual({
    allowed: false,
    enforced: true,
    limit: 0,
    remaining: 0,
    retryAfterMs: 10_000,
    windowStartedAtMs: 5_000,
    count: 0,
  });
});

test("a clock behind the stored window starts a new window", () => {
  const rule = rateRule(1, 10_000);
  const decision = decideRateLimit(rule, { count: 1, windowStartedAtMs: 9_000 }, 1_000);
  expect(decision.decision).toEqual({
    allowed: true,
    enforced: true,
    limit: 1,
    remaining: 0,
    windowStartedAtMs: 1_000,
    count: 1,
  });
});

test("rate rules reject fractional and negative numbers", () => {
  expect(() => rateRule(-1, 1_000)).toThrow("limit must be a non-negative integer");
  expect(() => rateRule(1.5, 1_000)).toThrow("limit must be a non-negative integer");
  expect(() => rateRule(1, 0)).toThrow("windowMs must be a positive integer");
});

test("the wired limiter is unenforced until a shared store exists", () => {
  expect(unenforcedRateLimit(rateRule(5, 1_000))).toEqual({
    allowed: true,
    enforced: false,
    limit: 5,
    remaining: null,
  });
  expect(rateLimitFlag).toEqual({ sharedStore: false, enforced: false });
});
