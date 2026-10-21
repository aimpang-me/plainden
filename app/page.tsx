import { PageHeading } from "@/components/page-heading";
import { ToolIndex } from "@/components/tool-index";
import { plannedTools } from "@/lib/catalog/planned";
import { shellToolOrder } from "@/lib/catalog/shell";
import { formatPrice, priceByLookupKey } from "@/lib/pricing/catalog";
import { JsonLd, metadataFor, pageByPath, siteOrigin } from "@/lib/seo";

export function generateMetadata() {
  const page = pageByPath("/");
  if (!page) return {};
  return metadataFor(page, siteOrigin());
}

export default function Home() {
  const page = pageByPath("/");
  const origin = siteOrigin();
  const toolPrice = priceByLookupKey("plainden_invoice_month");
  const bundlePrice = priceByLookupKey("plainden_all_month");
  const toolLabel = toolPrice ? formatPrice(toolPrice.amountCents, toolPrice.interval) : "";
  const bundleLabel = bundlePrice ? formatPrice(bundlePrice.amountCents, bundlePrice.interval) : "";
  const byId = new Map(plannedTools.map((tool) => [tool.id, tool]));
  const tools = shellToolOrder.flatMap((id) => {
    const tool = byId.get(id);
    if (!tool) return [];
    return [{ id: tool.id, href: `/${tool.slugs[0]}`, name: tool.name, description: tool.description }];
  });
  return (
    <article className="grid grid-cols-1 gap-8">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="max-w-3xl">
        <PageHeading>Small tools that run in the browser</PageHeading>
        <p className="mt-2 text-pretty text-[13px] text-muted">
          Free with limits. {toolLabel} removes the limits on one tool. {bundleLabel} covers every tool.
        </p>
      </header>
      <ToolIndex tools={tools} />
    </article>
  );
}
