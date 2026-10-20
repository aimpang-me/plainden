"use client";

import type { Entitlement } from "../contract/types";

export function useEntitlement(entitlementKey: string): Entitlement {
  return { entitlementKey, plan: "free" };
}
