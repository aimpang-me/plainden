import { ogImageResponse } from "@/lib/seo/og-response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return ogImageResponse({
    title: "plainden",
    description: "Small browser tools with a free limit and a $5 monthly plan.",
  });
}
