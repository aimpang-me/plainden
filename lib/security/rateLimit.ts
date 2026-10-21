export type RateRule = {
  limit: number;
  windowMs: number;
};

export type RateSnapshot = {
  count: number;
  windowStartedAtMs: number;
};

export type RateDecision =
  | {
      allowed: true;
      enforced: true;
      limit: number;
      remaining: number;
      windowStartedAtMs: number;
      count: number;
    }
  | {
      allowed: false;
      enforced: true;
      limit: number;
      remaining: 0;
      retryAfterMs: number;
      windowStartedAtMs: number;
      count: number;
    };

export function rateRule(limit: number, windowMs: number): RateRule {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("limit must be a non-negative integer");
  }
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive integer");
  }
  return { limit, windowMs };
}

export function decideRateLimit(
  rule: RateRule,
  snapshot: RateSnapshot | undefined,
  nowMs: number,
): { decision: RateDecision; next: RateSnapshot } {
  const inWindow =
    snapshot !== undefined &&
    nowMs >= snapshot.windowStartedAtMs &&
    nowMs < snapshot.windowStartedAtMs + rule.windowMs;
  const windowStartedAtMs = inWindow && snapshot ? snapshot.windowStartedAtMs : nowMs;
  const count = inWindow && snapshot ? snapshot.count : 0;
  if (count >= rule.limit) {
    return {
      decision: {
        allowed: false,
        enforced: true,
        limit: rule.limit,
        remaining: 0,
        retryAfterMs: windowStartedAtMs + rule.windowMs - nowMs,
        windowStartedAtMs,
        count,
      },
      next: { count, windowStartedAtMs },
    };
  }
  const nextCount = count + 1;
  return {
    decision: {
      allowed: true,
      enforced: true,
      limit: rule.limit,
      remaining: rule.limit - nextCount,
      windowStartedAtMs,
      count: nextCount,
    },
    next: { count: nextCount, windowStartedAtMs },
  };
}
