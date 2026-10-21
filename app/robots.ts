import { buildRobots } from "@/lib/seo";

export default function robots() {
  return buildRobots({ sitePublic: process.env.NEXT_PUBLIC_SITE_PUBLIC === "true" });
}
