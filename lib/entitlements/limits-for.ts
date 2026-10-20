import { plannedTools } from "../catalog/planned";
import type { ToolConfig } from "../contract/types";
import { registry } from "../../tools/registry.generated";

export function limitsFor(entitlementKey: string): ToolConfig["limits"] | undefined {
  const registered = registry.find((tool) => tool.config.entitlementKey === entitlementKey);
  if (registered) return registered.config.limits;
  return plannedTools.find((tool) => tool.entitlementKey === entitlementKey)?.limits;
}
