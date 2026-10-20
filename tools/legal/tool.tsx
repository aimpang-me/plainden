"use client";

import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";
import { PolicyForm } from "./form";

export default function Tool({ slug, preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  return <PolicyForm key={`${slug}:${preset ?? ""}`} slug={slug} preset={preset} plan={entitlement.plan} />;
}
