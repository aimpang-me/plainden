import type { ToolConfig } from "../../lib/contract/types.ts";
import { cookieRefundLongTail, legalLimits } from "../legal/catalog.ts";

export const config = {
  id: "cookie-refund",
  name: "Cookie and refund policy generator",
  slugs: ["cookie-policy-generator", "refund-policy-generator"],
  title: "Cookie and refund policy generator",
  description: "Draft a cookie policy or a refund policy from the same questionnaire engine.",
  entitlementKey: "legal",
  priceLookupKey: "plainden_legal_month",
  limits: legalLimits,
  seoPages: cookieRefundLongTail.map((page) => page.slug),
} satisfies ToolConfig;
