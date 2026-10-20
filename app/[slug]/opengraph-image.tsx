import { notFound } from "next/navigation";
import { pageByPath } from "@/lib/seo";
import { ogImageResponse } from "@/lib/seo/og-response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = pageByPath(`/${slug}`);
  if (!page) notFound();
  return ogImageResponse({ title: page.title, description: page.description });
}
