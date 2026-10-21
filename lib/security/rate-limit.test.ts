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

test("an unset store counts in memory and warns, and upstash without credentials throws", async () => {
  restore("NODE_ENV", "production");
  delete process.env.NEXT_PHASE;
  delete process.env.RATE_LIMIT_STORE;
  const warnings: string[] = [];
  const store = createRateLimitStore((message) => warnings.push(message));
  const first = await store.consume("write:preview", { limit: 1, windowMs: 60_000 }, 1_000);
  const second = await store.consume("write:preview", { limit: 1, windowMs: 60_000 }, 1_000);
  expect(warnings).toEqual(["RATE_LIMIT_STORE is unset. Using the in-memory rate limit store."]);
  expect(first.allowed).toBe(true);
  expect(second).toMatchObject({ allowed: false, retryAfterMs: 60_000 });

  process.env.RATE_LIMIT_STORE = "upstash";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  expect(() => createRateLimitStore()).toThrow("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
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

test("the memory store drops expired windows and caps how many keys it holds", async () => {
  const rule = { limit: 1, windowMs: 1_000 };
  const store = new MemoryRateLimitStore(3);
  await store.consume("a", rule, 0);
  await store.consume("b", rule, 0);
  await store.consume("c", rule, 0);
  expect((await store.consume("a", rule, 10)).allowed).toBe(false);
  await store.consume("d", rule, 2_000);
  expect(store.size).toBe(1);
  await store.consume("e", rule, 2_000);
  await store.consume("f", rule, 2_000);
  await store.consume("g", rule, 2_000);
  expect(store.size).toBe(3);
  expect((await store.consume("d", rule, 2_001)).allowed).toBe(true);
});
