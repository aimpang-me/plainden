import { afterEach, expect, test } from "vitest";
import { takeRateLimit } from "./enforce-rate-limit";
import {
  createRateLimitStore,
  MemoryRateLimitStore,
  resetRateLimitStore,
  UpstashRateLimitStore,
  rateBuckets,
} from "./rate-limit-store";

const previous = {
  nodeEnv: process.env.NODE_ENV,
  phase: process.env.NEXT_PHASE,
  mode: process.env.RATE_LIMIT_STORE,
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

afterEach(() => {
  restore("NODE_ENV", previous.nodeEnv);
  restore("NEXT_PHASE", previous.phase);
  restore("RATE_LIMIT_STORE", previous.mode);
  restore("UPSTASH_REDIS_REST_URL", previous.url);
  restore("UPSTASH_REDIS_REST_TOKEN", previous.token);
  resetRateLimitStore();
});

function restore(name: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}

test("the memory store allows the bucket, then refuses until the window ends", async () => {
  const store = new MemoryRateLimitStore();
  const rule = rateBuckets.write;
  const first = await store.consume("write:local", rule, 1_000);
  expect(first.allowed).toBe(true);
  if (!first.allowed) return;
  expect(first.remaining).toBe(rule.limit - 1);
  const blocked = await store.consume("write:local", { limit: 1, windowMs: 60_000 }, 1_000);
  expect(blocked).toMatchObject({ allowed: false, retryAfterMs: 60_000 });
  const later = await store.consume("write:local", { limit: 1, windowMs: 60_000 }, 61_000);
  expect(later.allowed).toBe(true);
});

test("an upstash count above the limit is a refusal", async () => {
  const calls: string[][] = [];
  const store = new UpstashRateLimitStore("https://example.test", "token", async (_url, _token, command) => {
    calls.push([...command]);
    return command[0] === "INCR" ? 2 : "OK";
  });
  const decision = await store.consume("scan:local", { limit: 1, windowMs: 60_000 }, 5_000);
  expect(decision).toMatchObject({ allowed: false, count: 2, remaining: 0 });
  expect(calls[0]?.[0]).toBe("INCR");
});

test("production without a shared store throws, and memory is the dev fallback", () => {
  restore("NODE_ENV", "production");
  delete process.env.NEXT_PHASE;
  delete process.env.RATE_LIMIT_STORE;
  expect(() => createRateLimitStore()).toThrow("A shared rate limit store is required in production");
  restore("NODE_ENV", "test");
  delete process.env.RATE_LIMIT_STORE;
  expect(createRateLimitStore()).toBeInstanceOf(MemoryRateLimitStore);
});

test("takeRateLimit returns 429 once the bucket is full", async () => {
  process.env.RATE_LIMIT_STORE = "memory";
  resetRateLimitStore();
  for (let attempt = 0; attempt < rateBuckets.scan.limit; attempt += 1) {
    expect(await takeRateLimit("scan", "once", 10_000)).toBeNull();
  }
  const blocked = await takeRateLimit("scan", "once", 10_000);
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("retry-after")).toBe("60");
  expect(await blocked?.json()).toEqual({
    error: "rate-limited",
    message: "Too many requests. Try again later.",
  });
});
