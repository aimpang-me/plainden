import type { ToolConfig } from "../../lib/contract/types";
import { copy } from "./copy.ts";

export const config = {
  id: "qr",
  name: "QR code generator",
  slugs: ["qr-code-generator"],
  title: "QR code generator",
  description: "Make a QR code for a link, text, wifi network, or contact card.",
  entitlementKey: "qr",
  priceLookupKey: "plainden_qr_month",
  limits: { free: { savedItems: 0 }, paid: { savedItems: 20 } },
  seoPages: copy.longTail.map((page) => page.slug),
} satisfies ToolConfig;
