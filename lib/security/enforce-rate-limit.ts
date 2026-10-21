import { rateBuckets, rateLimitStore, type RateBucket } from "./rate-limit-store";

export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim() ?? "";
  if (first.length > 0) return first;
  const real = headers.get("x-real-ip")?.trim() ?? "";
  if (real.length > 0) return real;
  return "local";
}

export async function takeRateLimit(bucket: RateBucket, identity: string, nowMs = Date.now()): Promise<Response | null> {
  const decision = await rateLimitStore().consume(`${bucket}:${identity}`, rateBuckets[bucket], nowMs);
  if (decision.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
  return Response.json(
    { error: "rate-limited", message: "Too many requests. Try again later." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

export async function takeSignInLimit(headers: Headers, email: string): Promise<Response | null> {
  const address = clientAddress(headers);
  const byAddress = await takeRateLimit("sign-in-ip", address);
  if (byAddress) return byAddress;
  return takeRateLimit("sign-in", `${address}:${email.trim().toLowerCase()}`);
}
