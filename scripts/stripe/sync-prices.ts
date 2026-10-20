import Stripe from "stripe";
import { pricesToCreate } from "../../lib/pricing/catalog.ts";

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY is required");
    process.exit(1);
  }
  const stripe = new Stripe(key);
  for (const price of pricesToCreate()) {
    const existing = await stripe.prices.list({ lookup_keys: [price.lookupKey], limit: 1 });
    if (existing.data[0]) continue;
    const product = await stripe.products.create({ name: price.name });
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: price.amountCents,
      lookup_key: price.lookupKey,
      recurring: { interval: price.interval },
    });
    console.log(`created ${price.lookupKey}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "price sync failed");
  process.exit(1);
});
