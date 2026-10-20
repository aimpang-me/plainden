import type { Entitlement } from "../contract/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readEntitlementPayload(body: unknown, entitlementKey: string): Entitlement {
  if (!isRecord(body) || body.entitlementKey !== entitlementKey) {
    return { entitlementKey, plan: "free" };
  }
  return { entitlementKey, plan: body.plan === "paid" ? "paid" : "free" };
}
