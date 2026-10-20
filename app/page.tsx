import Link from "next/link";
import { plannedTools } from "@/lib/catalog/planned";
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
  return (
    <article className="grid gap-6">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="grid gap-2">
        <h1 className="text-3xl">Small tools that run in the browser</h1>
        <p>
          Free with limits. {toolLabel} removes the limits on one tool. {bundleLabel} covers every tool.
        </p>
      </header>
      <ul className="grid gap-4">
        {plannedTools.map((tool) => (
          <li key={tool.id} className="border border-line p-4">
            <Link href={`/${tool.slugs[0]}`} className="text-lg">
              {tool.name}
            </Link>
            <p className="text-muted">{tool.description}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
