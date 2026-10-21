import { and, eq, isNull } from "drizzle-orm";
import { user, subscription } from "../../db/schema";
import { getDb } from "../db/client";
import { priceByLookupKey } from "../pricing/catalog";
import { blocksAnotherCheckout } from "./access";
import type { CheckoutInput, CheckoutResult, PortalInput, PortalResult } from "./types";
import { PaymentsNotConfigured } from "./errors";
import { paddlePriceEnv } from "./subscription";

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const userId = userIdFrom(input.subject);
  const price = priceByLookupKey(input.priceLookupKey);
  if (!price || price.amountCents <= 0) throw new Error(`Unknown price ${input.priceLookupKey}`);
  assertCheckoutReady();
  const priceId = process.env[paddlePriceEnv(price.interval)];
  if (!priceId || !process.env.PADDLE_API_KEY) throw new PaymentsNotConfigured();
  const db = await getDb();
  const rows = await db
    .select({ email: user.email, providerCustomerId: user.providerCustomerId })
    .from(user)
    .where(eq(user.id, userId));
  const account = rows[0];
  if (!account?.email) throw new Error("Unknown user");
  const existing = await db
    .select({ status: subscription.status })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  if (existing.some((row) => blocksAnotherCheckout(row.status))) {
    throw new Error("You already have a subscription. Manage billing to change it.");
  }
  const customData = {
    userId,
    entitlementKey: price.entitlementKey,
    priceLookupKey: price.lookupKey,
  };
  const payload = await paddlePost(
    "/transactions",
    account.providerCustomerId
      ? { items: [{ price_id: priceId, quantity: 1 }], custom_data: customData, customer_id: account.providerCustomerId }
      : { items: [{ price_id: priceId, quantity: 1 }], custom_data: customData, customer: { email: account.email } },
  );
  const data = record(record(payload)?.data);
  const transactionId = text(data, "id");
  if (!transactionId) throw new Error("Paddle did not return a transaction");
  const customerId = text(data, "customer_id");
  if (customerId && !account.providerCustomerId) {
    await db.update(user).set({ providerCustomerId: customerId }).where(and(eq(user.id, userId), isNull(user.providerCustomerId)));
  }
  return { transactionId };
}

export async function createPortal(input: PortalInput): Promise<PortalResult> {
  const userId = userIdFrom(input.subject);
  assertCheckoutReady();
  if (!process.env.PADDLE_API_KEY) throw new PaymentsNotConfigured();
  const db = await getDb();
  const rows = await db.select({ providerCustomerId: user.providerCustomerId }).from(user).where(eq(user.id, userId));
  const customer = rows[0]?.providerCustomerId;
  if (!customer) throw new Error("No billing customer for this user");
  const payload = await paddlePost(`/customers/${encodeURIComponent(customer)}/portal-sessions`, {});
  const urls = record(record(record(payload)?.data)?.urls);
  const overview = text(record(urls?.general), "overview");
  if (!overview) throw new Error("Paddle did not return a portal URL");
  return { url: overview };
}

function assertCheckoutReady(): void {
  if (process.env.CHECKOUT_ENABLED === "false") throw new Error("Checkout is turned off.");
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.NEXT_PUBLIC_SITE_URL || !process.env.BETTER_AUTH_URL) {
    throw new Error("Site URL is not configured");
  }
}

async function paddlePost(path: string, body: unknown): Promise<unknown> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new PaymentsNotConfigured();
  const base = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Paddle refused the request");
  return response.json();
}

function userIdFrom(subject: CheckoutInput["subject"]): string {
  if ("userId" in subject && typeof subject.userId === "string" && subject.userId.length > 0) return subject.userId;
  throw new Error("Checkout needs a user");
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(data: Record<string, unknown> | null, key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
