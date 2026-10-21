import type { ToolConfig } from "../contract/types";
import { plannedTools } from "./planned";
import { disabledToolIds } from "./visibility";

export function shellTools(raw?: string): readonly ToolConfig[] {
  const hidden = new Set(disabledToolIds(raw));
  return plannedTools.filter((tool) => !hidden.has(tool.id));
}
