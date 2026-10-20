import type { ToolConfig } from "../../lib/contract/types";

export const config = {
  id: "scaffold",
  name: "Scaffold check",
  slugs: ["scaffold-check"],
  title: "Scaffold check",
  description: "A temporary page that proves a tool folder renders at its slug.",
  entitlementKey: "scaffold",
  priceLookupKey: "plainden_scaffold_month",
  limits: { free: { perMonth: 3 }, paid: { perMonth: 30 } },
  seoPages: [
    "scaffold-check-count",
    "scaffold-check-note",
    "scaffold-check-file",
    "scaffold-check-format",
    "scaffold-check-limit",
  ],
} satisfies ToolConfig;
