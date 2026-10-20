"use client";

import { useEffect, useState } from "react";
import type { Entitlement } from "../contract/types";
import { readEntitlementPayload } from "./entitlement-payload";

export type EntitlementView = Entitlement & { status: "loading" | "ready" };

export function useEntitlement(entitlementKey: string): EntitlementView {
  const [view, setView] = useState<EntitlementView>({ entitlementKey, plan: "free", status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ key: entitlementKey });
    fetch(`/api/entitlement?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        setView({ entitlementKey, plan: readEntitlementPayload(body, entitlementKey).plan, status: "ready" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setView({ entitlementKey, plan: "free", status: "ready" });
      });
    return () => controller.abort();
  }, [entitlementKey]);

  return view;
}
