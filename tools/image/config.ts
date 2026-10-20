import type { ToolConfig } from "../../lib/contract/types";
import { imageLimits, imageOps, opOrder } from "./engine.ts";

export const config = {
  id: "image",
  name: "Image tools",
  slugs: opOrder.map((op) => imageOps[op].primarySlug),
  title: "Image tools",
  description: "Compress, resize, or convert images in the browser.",
  entitlementKey: "image",
  priceLookupKey: "plainden_image_month",
  limits: imageLimits,
  seoPages: opOrder.flatMap((op) => imageOps[op].longTail.map((page) => page.slug)),
} satisfies ToolConfig;
