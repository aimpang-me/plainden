import type { ToolConfig } from "../../lib/contract/types.ts";
import { legalLimits, legalLongTail } from "./catalog.ts";

export const config = {
  id: "legal",
  name: "Privacy and terms generator",
  slugs: ["privacy-policy-generator", "terms-and-conditions-generator"],
  title: "Privacy and terms generator",
  description: "Answer a questionnaire and copy a privacy policy or terms draft.",
  entitlementKey: "legal",
  priceLookupKey: "plainden_legal_month",
  limits: legalLimits,
  seoPages: legalLongTail.map((page) => page.slug),
} satisfies ToolConfig;
