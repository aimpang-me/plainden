import { isProductionRuntime } from "../runtime";
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
  private readonly snapshots = new Map<string, RateSnapshot>();

  async consume(key: string, rule: RateRule, nowMs: number): Promise<RateDecision> {
    const current = decideRateLimit(rule, this.snapshots.get(key), nowMs);
    this.snapshots.set(key, current.next);
    return current.decision;
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

export function createRateLimitStore(): RateLimitStore {
  const mode = process.env.RATE_LIMIT_STORE;
  if (mode === "upstash") return upstashFromEnv();
  if (mode === "memory") {
    if (isProductionRuntime()) throw new Error("RATE_LIMIT_STORE=memory is not allowed in production");
    return new MemoryRateLimitStore();
  }
  if (mode !== undefined && mode.trim() !== "") {
    throw new Error("RATE_LIMIT_STORE must be memory or upstash");
  }
  if (isProductionRuntime()) throw new Error("A shared rate limit store is required in production");
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
