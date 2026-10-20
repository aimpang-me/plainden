import type { ToolConfig } from "../../lib/contract/types.ts";
import { invoiceLimits } from "../invoice/limits.ts";

export const config = {
  id: "receipt",
  name: "Receipt generator",
  slugs: ["receipt-generator"],
  title: "Receipt generator",
  description: "Make a receipt with a payment method, receipt number, and paid stamp.",
  entitlementKey: "invoice",
  priceLookupKey: "plainden_invoice_month",
  limits: invoiceLimits,
  seoPages: [],
} satisfies ToolConfig;
