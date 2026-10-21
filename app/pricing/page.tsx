import { PageHeading } from "@/components/page-heading";
import { PricingPlans } from "@/components/pricing-plans";
import { JsonLd, metadataFor, pageByPath, siteOrigin } from "@/lib/seo";

export function generateMetadata() {
  const page = pageByPath("/pricing");
  if (!page) return {};
  return metadataFor(page, siteOrigin());
}

export default function PricingPage() {
  const page = pageByPath("/pricing");
  const origin = siteOrigin();
  return (
    <article className="grid grid-cols-1 gap-8">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="max-w-3xl">
        <PageHeading>Pricing</PageHeading>
        <p className="mt-2 text-pretty text-[13px] text-muted">
          Free with limits, $5 a month for one tool, or $9 a month for every tool. Receipt shares the invoice plan. Cookie and refund share the legal plan.
        </p>
      </header>
      <PricingPlans />
    </article>
  );
}
