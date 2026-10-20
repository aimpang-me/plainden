import { ToolIndex } from "@/components/tool-index";
import { plannedTools } from "@/lib/catalog/planned";
import { disabledToolIds } from "@/lib/catalog/visibility";
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
  const tools = plannedTools
    .filter((tool) => !disabledToolIds().includes(tool.id))
    .map((tool) => ({
      id: tool.id,
      href: `/${tool.slugs[0]}`,
      name: tool.name,
      description: tool.description,
    }));
  return (
    <article className="grid grid-cols-1 gap-16">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-[56px] font-medium leading-[1.05] tracking-[-0.035em] max-[800px]:text-[38px]">
          Small tools that run in the browser
        </h1>
        <p className="mt-5 text-pretty text-lg text-muted max-[800px]:text-base">
          Free with limits. {toolLabel} removes the limits on one tool. {bundleLabel} covers every tool.
        </p>
      </header>
      <ToolIndex tools={tools} />
    </article>
  );
}
