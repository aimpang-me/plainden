import type { ToolConfig } from "../../lib/contract/types.ts";
import { invoiceLimits } from "./limits.ts";

export const config = {
  id: "invoice",
  name: "Invoice generator",
  slugs: ["invoice-generator"],
  title: "Invoice generator",
  description: "Fill in a client, line items, and tax, then download a PDF.",
  entitlementKey: "invoice",
  priceLookupKey: "plainden_invoice_month",
  limits: invoiceLimits,
  seoPages: [],
} satisfies ToolConfig;
