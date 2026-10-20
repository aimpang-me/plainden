"use client";

import { useEffect, useState } from "react";
import type { Entitlement } from "../contract/types";
import { readEntitlementPayload } from "./entitlement-payload";

export function useEntitlement(entitlementKey: string): Entitlement {
  const [plan, setPlan] = useState<Entitlement["plan"]>("free");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ key: entitlementKey });
    fetch(`/api/entitlement?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        setPlan(readEntitlementPayload(body, entitlementKey).plan);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlan("free");
      });
    return () => controller.abort();
  }, [entitlementKey]);

  return { entitlementKey, plan };
}
