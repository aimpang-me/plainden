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
    <article className="grid grid-cols-1 gap-16">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-[56px] font-medium leading-[1.05] tracking-[-0.035em] max-[800px]:text-[38px]">
          Pricing
        </h1>
        <p className="mt-5 text-pretty text-lg text-muted max-[800px]:text-base">
          Free with limits, $5 a month for one tool, or $9 a month for every tool. Receipt shares the invoice plan. Cookie and refund share the legal plan.
        </p>
      </header>
      <PricingPlans />
    </article>
  );
}
