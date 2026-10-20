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
    <article className="grid gap-4">
      {page ? <JsonLd page={page} origin={origin} /> : null}
      <h1 className="text-3xl">Pricing</h1>
      <p>Annual prices are 10 times the monthly price. Receipt shares the invoice plan. Cookie and refund share the legal plan.</p>
      <ul className="grid gap-2">
        {listed.map((price) => (
          <li key={price.lookupKey} className="flex items-baseline justify-between gap-4 border border-line px-3 py-2">
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
