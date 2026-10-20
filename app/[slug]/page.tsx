import { notFound } from "next/navigation";
import { ToolScreen } from "@/components/tool-screen";
import { resolveSlug, staticSlugs } from "@/lib/pages/resolve";
import { JsonLd, metadataFor, pageByPath, siteOrigin } from "@/lib/seo";

export const instant = false;

export function generateStaticParams() {
  return staticSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = pageByPath(`/${slug}`);
  if (!page) return {};
  return metadataFor(page, siteOrigin());
}

export default async function Page(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = resolveSlug(slug);
  if (!page) notFound();
  const seo = pageByPath(`/${slug}`);
  const origin = siteOrigin();
  return (
    <>
      {seo ? <JsonLd page={seo} origin={origin} /> : null}
      <ToolScreen page={page} />
    </>
  );
}
