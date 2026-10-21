import { decideRateLimit, rateRule, type RateDecision, type RateRule, type RateSnapshot } from "./rateLimit";

export type RateBucket = "sign-in" | "sign-in-ip" | "write" | "scan";

export const rateBuckets: Record<RateBucket, RateRule> = {
  "sign-in": rateRule(8, 10 * 60_000),
  "sign-in-ip": rateRule(40, 10 * 60_000),
  write: rateRule(120, 60_000),
  scan: rateRule(120, 60_000),
};

export type RateLimitStore = {
  consume(key: string, rule: RateRule, nowMs: number): Promise<RateDecision>;
};

export type RateCommand = (url: string, token: string, command: readonly string[]) => Promise<unknown>;

const globals = globalThis as typeof globalThis & {
  __plaindenRateLimit?: RateLimitStore;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { snapshot: RateSnapshot; expiresAtMs: number }>();

  constructor(private readonly maxKeys = 10_000) {}

  get size(): number {
    return this.entries.size;
  }

  async consume(key: string, rule: RateRule, nowMs: number): Promise<RateDecision> {
    const entry = this.entries.get(key);
    const current = decideRateLimit(rule, entry?.snapshot, nowMs);
    this.entries.delete(key);
    if (this.entries.size >= this.maxKeys) this.evict(nowMs);
    this.entries.set(key, { snapshot: current.next, expiresAtMs: current.next.windowStartedAtMs + rule.windowMs });
    return current.decision;
  }

  private evict(nowMs: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAtMs <= nowMs) this.entries.delete(key);
    }
    const oldest = this.entries.keys().next();
    if (this.entries.size >= this.maxKeys && !oldest.done) this.entries.delete(oldest.value);
  }
}

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly execute: RateCommand = executeUpstash,
  ) {}

  async consume(key: string, rule: RateRule, nowMs: number): Promise<RateDecision> {
    const windowStartedAtMs = nowMs - (nowMs % rule.windowMs);
    const redisKey = `plainden:rl:${key}:${windowStartedAtMs}`;
    const count = await this.execute(this.url, this.token, ["INCR", redisKey]);
    if (typeof count !== "number" || !Number.isInteger(count)) {
      throw new Error("rate limit store returned a non-integer count");
    }
    if (count === 1) await this.execute(this.url, this.token, ["PEXPIRE", redisKey, String(rule.windowMs)]);
    if (count > rule.limit) {
      return {
        allowed: false,
        enforced: true,
        limit: rule.limit,
        remaining: 0,
        retryAfterMs: windowStartedAtMs + rule.windowMs - nowMs,
        windowStartedAtMs,
        count,
      };
    }
    return {
      allowed: true,
      enforced: true,
      limit: rule.limit,
      remaining: rule.limit - count,
      windowStartedAtMs,
      count,
    };
  }
}

async function executeUpstash(url: string, token: string, command: readonly string[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error("rate limit store request failed");
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("result" in body)) {
    throw new Error("rate limit store returned an unexpected body");
  }
  return body.result;
}

export function createRateLimitStore(warn: (message: string) => void = console.warn): RateLimitStore {
  const mode = process.env.RATE_LIMIT_STORE?.trim() ?? "";
  if (mode === "upstash") return upstashFromEnv();
  if (mode === "memory") return new MemoryRateLimitStore();
  if (mode !== "") throw new Error("RATE_LIMIT_STORE must be memory or upstash");
  warn("RATE_LIMIT_STORE is unset. Using the in-memory rate limit store.");
  return new MemoryRateLimitStore();
}

export function rateLimitStore(): RateLimitStore {
  const existing = globals.__plaindenRateLimit;
  if (existing) return existing;
  const created = createRateLimitStore();
  globals.__plaindenRateLimit = created;
  return created;
}

export function resetRateLimitStore(): void {
  delete globals.__plaindenRateLimit;
}

function upstashFromEnv(): UpstashRateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (url.length === 0 || token.length === 0) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }
  return new UpstashRateLimitStore(url, token);
}
