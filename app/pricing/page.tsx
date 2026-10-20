import { Button } from "@/components/ui/button";
import { formatPrice, prices } from "@/lib/pricing/catalog";
import { JsonLd, metadataFor, pageByPath, siteOrigin } from "@/lib/seo";
import { checkoutAction, portalAction } from "./actions";

export function generateMetadata() {
  const page = pageByPath("/pricing");
  if (!page) return {};
  return metadataFor(page, siteOrigin());
}

export default function PricingPage() {
  const page = pageByPath("/pricing");
  const origin = siteOrigin();
  const listed = prices.filter((price) => price.amountCents > 0);
  return (
    <article className="grid gap-12">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-[56px] font-medium leading-[1.05] tracking-[-0.035em] max-[800px]:text-[38px]">Pricing</h1>
        <p className="mt-5 text-lg text-muted max-[800px]:text-base">
          Annual prices are 10 times the monthly price. Receipt shares the invoice plan. Cookie and refund share the legal plan.
        </p>
      </header>
      <ul className="grid gap-4">
        {listed.map((price) => (
          <li
            key={price.lookupKey}
            className="flex flex-wrap items-baseline justify-between gap-4 rounded-3xl border border-line-soft px-6 py-5"
          >
            <span>{price.name}</span>
            <span>{formatPrice(price.amountCents, price.interval)}</span>
            <span className="text-muted">{price.lookupKey}</span>
            <form action={checkoutAction}>
              <input type="hidden" name="lookupKey" value={price.lookupKey} />
              <Button type="submit">Checkout</Button>
            </form>
          </li>
        ))}
      </ul>
      <form action={portalAction}>
        <Button type="submit" variant="plain">
          Open billing portal
        </Button>
      </form>
    </article>
  );
}
