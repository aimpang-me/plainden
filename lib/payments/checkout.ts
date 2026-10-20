import { eq } from "drizzle-orm";
import { user, subscription } from "../../db/schema";
import { getDb } from "../db/client";
import { priceByLookupKey } from "../pricing/catalog";
import type { CheckoutInput, CheckoutResult, PortalInput, PortalResult } from "./types";
import { getStripe } from "./stripe-client";

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const stripe = getStripe();
  const userId = userIdFrom(input.subject);
  const price = priceByLookupKey(input.priceLookupKey);
  if (!price || price.amountCents <= 0) throw new Error(`Unknown price ${input.priceLookupKey}`);
  const db = await getDb();
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  const email = rows[0]?.email;
  if (!email) throw new Error("Unknown user");
  const listed = await stripe.prices.list({ lookup_keys: [price.lookupKey], limit: 1 });
  const stripePrice = listed.data[0];
  if (!stripePrice) throw new Error(`Stripe has no price for ${price.lookupKey}`);
  const origin = appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: stripePrice.id, quantity: 1 }],
    success_url: absoluteUrl(origin, input.successPath),
    cancel_url: absoluteUrl(origin, input.cancelPath),
    metadata: {
      userId,
      entitlementKey: price.entitlementKey,
      priceLookupKey: price.lookupKey,
    },
    subscription_data: {
      metadata: {
        userId,
        entitlementKey: price.entitlementKey,
        priceLookupKey: price.lookupKey,
      },
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function createPortal(input: PortalInput): Promise<PortalResult> {
  const stripe = getStripe();
  const userId = userIdFrom(input.subject);
  const db = await getDb();
  const rows = await db
    .select({ stripeCustomerId: subscription.stripeCustomerId })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  const customer = rows.find((row) => row.stripeCustomerId)?.stripeCustomerId;
  if (!customer) throw new Error("No Stripe customer for this user");
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: absoluteUrl(appOrigin(), input.returnPath),
  });
  return { url: session.url };
}

function userIdFrom(subject: CheckoutInput["subject"]): string {
  if ("userId" in subject && typeof subject.userId === "string" && subject.userId.length > 0) return subject.userId;
  throw new Error("Checkout needs a user");
}

function appOrigin(): string {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return configured;
  const port = process.env.PORT ?? "3100";
  return `http://127.0.0.1:${port}`;
}

function absoluteUrl(origin: string, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("path must start with /");
  return `${origin}${path}`;
}
