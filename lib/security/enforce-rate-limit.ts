import type { RateDecision } from "./rateLimit";
import { rateBuckets, rateLimitStore, type RateBucket } from "./rate-limit-store";

export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim() ?? "";
  if (first.length > 0) return first;
  const real = headers.get("x-real-ip")?.trim() ?? "";
  if (real.length > 0) return real;
  return "local";
}

export function consumeRateLimit(bucket: RateBucket, identity: string, nowMs = Date.now()): Promise<RateDecision> {
  return rateLimitStore().consume(`${bucket}:${identity}`, rateBuckets[bucket], nowMs);
}

export async function consumeSignInLimit(headers: Headers, email: string): Promise<RateDecision> {
  const address = clientAddress(headers);
  const byAddress = await consumeRateLimit("sign-in-ip", address);
  if (!byAddress.allowed) return byAddress;
  return consumeRateLimit("sign-in", `${address}:${email.trim().toLowerCase()}`);
}

export async function takeRateLimit(bucket: RateBucket, identity: string, nowMs = Date.now()): Promise<Response | null> {
  return tooManyRequests(await consumeRateLimit(bucket, identity, nowMs));
}

export async function takeSignInLimit(headers: Headers, email: string): Promise<Response | null> {
  return tooManyRequests(await consumeSignInLimit(headers, email));
}

function tooManyRequests(decision: RateDecision): Response | null {
  if (decision.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
  return Response.json(
    { error: "rate-limited", message: "Too many requests. Try again later." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
