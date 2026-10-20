import { notFound } from "next/navigation";
import { ToolScreen } from "@/components/tool-screen";
import { resolveSlug, staticSlugs } from "@/lib/pages/resolve";

export const instant = false;

export function generateStaticParams() {
  return staticSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = resolveSlug(slug);
  if (!page) return {};
  if (page.kind === "tool") return { title: page.headline };
  if (page.kind === "planned") return { title: page.tool.name };
  const unreachable: never = page;
  return unreachable;
}

export default async function Page(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = resolveSlug(slug);
  if (!page) notFound();
  return <ToolScreen page={page} />;
}
