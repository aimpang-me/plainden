import { and, eq, isNull } from "drizzle-orm";
import { user, subscription } from "../../db/schema";
import { getDb, type AppDatabase } from "../db/client";
import { priceByLookupKey } from "../pricing/catalog";
import { isOpenSubscription } from "./access";
import {
  acquireCheckout,
  bindCheckoutIntent,
  releaseCheckoutIntent,
  restoreCheckoutIntent,
  takeOverCheckout,
  type AcquiredCheckout,
} from "./checkout-intent";
import { CheckoutError, PaymentsNotConfigured } from "./errors";
import { record, text } from "./json";
import { paddlePriceEnv } from "./subscription";
import type { CheckoutInput, CheckoutResult, PortalInput, PortalResult } from "./types";

type CheckoutAccount = { email: string; providerCustomerId: string | null };

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const userId = userIdFrom(input.subject);
  const price = priceByLookupKey(input.priceLookupKey);
  if (!price || price.amountCents <= 0) throw new CheckoutError("unknown-price", `Unknown price ${input.priceLookupKey}`);
  assertCheckoutReady();
  const priceId = process.env[paddlePriceEnv(price.interval)];
  if (!priceId || !process.env.PADDLE_API_KEY) throw new PaymentsNotConfigured();
  const db = await getDb();
  const [rows, existing] = await Promise.all([
    db.select({ email: user.email, providerCustomerId: user.providerCustomerId }).from(user).where(eq(user.id, userId)),
    db.select({ status: subscription.status }).from(subscription).where(eq(subscription.userId, userId)),
  ]);
  const account = rows[0];
  if (!account?.email) throw new CheckoutError("no-user", "Unknown user");
  if (existing.some((row) => isOpenSubscription(row.status))) throw alreadySubscribed();
  if (account.providerCustomerId) {
    const open = await openCheckoutFor(account.providerCustomerId, priceId);
    if (open) return { transactionId: open };
  }
  const ready = await ownerOrReuse(db, userId, price.lookupKey, await acquireCheckout(db, userId, price.lookupKey));
  if (ready.kind === "reuse") return { transactionId: ready.transactionId };
  return {
    transactionId: await createOwnedTransaction(db, ready.id, userId, price.lookupKey, priceId, account),
  };
}

export async function createPortal(input: PortalInput): Promise<PortalResult> {
  const userId = userIdFrom(input.subject);
  assertCheckoutReady();
  if (!process.env.PADDLE_API_KEY) throw new PaymentsNotConfigured();
  const db = await getDb();
  const [rows, subscriptions] = await Promise.all([
    db.select({ providerCustomerId: user.providerCustomerId }).from(user).where(eq(user.id, userId)),
    db
      .select({ status: subscription.status, providerSubscriptionId: subscription.providerSubscriptionId })
      .from(subscription)
      .where(eq(subscription.userId, userId)),
  ]);
  const customer = rows[0]?.providerCustomerId;
  if (!customer) throw new CheckoutError("no-customer", "No billing customer for this user");
  const open = subscriptions.filter(
    (row): row is { status: string; providerSubscriptionId: string } =>
      isOpenSubscription(row.status) && typeof row.providerSubscriptionId === "string" && row.providerSubscriptionId.length > 0,
  );
  const chosen = open.find((row) => row.status === "active") ?? open[0];
  if (!chosen) throw new CheckoutError("no-subscription", "No active subscription for this user");
  const payload = await paddle("POST", `/customers/${encodeURIComponent(customer)}/portal-sessions`, {
    subscription_ids: [chosen.providerSubscriptionId],
  });
  const urls = record(record(record(payload)?.data)?.urls);
  const listed = Array.isArray(urls?.subscriptions) ? urls.subscriptions : [];
  const match = listed.map((item) => record(item)).find((item) => text(item, "id") === chosen.providerSubscriptionId);
  const view = text(match ?? null, "view_subscription");
  if (!view) throw new CheckoutError("upstream", "Paddle did not return a portal URL");
  return { url: view };
}

async function openCheckoutFor(customerId: string, priceId: string): Promise<string | null> {
  const customer = encodeURIComponent(customerId);
  const [subscriptions, transactions] = await Promise.all([
    paddle("GET", `/subscriptions?customer_id=${customer}&status=active,trialing,past_due,paused`),
    paddle("GET", `/transactions?customer_id=${customer}&status=draft,ready&order_by=created_at[DESC]`),
  ]);
  if (listed(subscriptions).length > 0) throw alreadySubscribed();
  const pending = listed(transactions).find((transaction) => transactionHasPrice(transaction, priceId));
  return text(pending ?? null, "id");
}

function listed(payload: unknown): Record<string, unknown>[] {
  const data = record(payload)?.data;
  if (!Array.isArray(data)) return [];
  return data.map(record).filter((item): item is Record<string, unknown> => item !== null);
}

function transactionHasPrice(transaction: Record<string, unknown>, priceId: string): boolean {
  const items = Array.isArray(transaction.items) ? transaction.items : [];
  return items.some((item) => {
    const line = record(item);
    return text(line, "price_id") === priceId || text(record(line?.price), "id") === priceId;
  });
}

function alreadySubscribed(): CheckoutError {
  return new CheckoutError("already-subscribed", "You already have a subscription. Manage billing to change it.");
}

function assertCheckoutReady(): void {
  if (process.env.CHECKOUT_ENABLED === "false") throw new CheckoutError("off", "Checkout is turned off.");
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.NEXT_PUBLIC_SITE_URL || !process.env.BETTER_AUTH_URL) {
    throw new CheckoutError("site-url", "Site URL is not configured");
  }
}

async function createOwnedTransaction(
  db: AppDatabase,
  intentId: string,
  userId: string,
  priceLookupKey: string,
  priceId: string,
  account: CheckoutAccount,
): Promise<string> {
  try {
    const items = [{ price_id: priceId, quantity: 1 }];
    const customData = { userId, priceLookupKey };
    const payload = await paddle(
      "POST",
      "/transactions",
      account.providerCustomerId
        ? { items, custom_data: customData, customer_id: account.providerCustomerId }
        : { items, custom_data: customData, customer: { email: account.email } },
    );
    const data = record(record(payload)?.data);
    const transactionId = text(data, "id");
    if (!transactionId) throw new CheckoutError("upstream", "Paddle did not return a transaction");
    const customerId = text(data, "customer_id");
    if (customerId && !account.providerCustomerId) {
      await db
        .update(user)
        .set({ providerCustomerId: customerId })
        .where(and(eq(user.id, userId), isNull(user.providerCustomerId)));
    }
    const bound = await bindCheckoutIntent(db, intentId, transactionId);
    if (!bound) {
      await cancelUnpaidTransaction(transactionId);
      throw new CheckoutError("upstream", "Checkout is already in progress");
    }
    return transactionId;
  } catch (error) {
    await releaseCheckoutIntent(db, intentId);
    throw error;
  }
}

type ReadyCheckout = Exclude<AcquiredCheckout, { kind: "switch" }>;

async function ownerOrReuse(
  db: AppDatabase,
  userId: string,
  priceLookupKey: string,
  acquired: AcquiredCheckout,
): Promise<ReadyCheckout> {
  if (acquired.kind !== "switch") return acquired;
  const ownerId = await switchCheckout(db, acquired, priceLookupKey);
  if (ownerId) return { kind: "owner", id: ownerId };
  const again = await acquireCheckout(db, userId, priceLookupKey);
  if (again.kind === "switch") throw new CheckoutError("upstream", "Checkout is already in progress");
  return again;
}

async function switchCheckout(
  db: AppDatabase,
  acquired: Extract<AcquiredCheckout, { kind: "switch" }>,
  priceLookupKey: string,
): Promise<string | null> {
  const ownerId = await takeOverCheckout(db, acquired.intentId, acquired.transactionId, priceLookupKey);
  if (!ownerId) return null;
  let outcome: "canceled" | "paid";
  try {
    outcome = await cancelUnpaidTransaction(acquired.transactionId);
  } catch (error) {
    const restored = await restoreCheckoutIntent(db, ownerId, {
      id: acquired.intentId,
      priceLookupKey: acquired.priceLookupKey,
      transactionId: acquired.transactionId,
    }).catch(() => false);
    if (!restored) await releaseCheckoutIntent(db, ownerId).catch(() => undefined);
    throw error;
  }
  if (outcome === "paid") {
    await releaseCheckoutIntent(db, ownerId);
    throw new CheckoutError("open-checkout", "Finish or cancel your open checkout first.");
  }
  return ownerId;
}

async function cancelUnpaidTransaction(transactionId: string): Promise<"canceled" | "paid"> {
  const path = `/transactions/${encodeURIComponent(transactionId)}`;
  try {
    await paddle("PATCH", path, { status: "canceled" });
    return "canceled";
  } catch (error) {
    if (!(error instanceof CheckoutError)) throw error;
    const payload = await paddle("GET", path);
    const status = text(record(record(payload)?.data), "status");
    if (status === "canceled") return "canceled";
    if (status === "completed" || status === "billed" || status === "paid") return "paid";
    throw error;
  }
}

async function paddle(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<unknown> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new PaymentsNotConfigured();
  const base = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new CheckoutError("upstream", "Paddle refused the request");
  }
  if (!response.ok) throw new CheckoutError("upstream", "Paddle refused the request");
  return response.json();
}

function userIdFrom(subject: CheckoutInput["subject"]): string {
  if ("userId" in subject && typeof subject.userId === "string" && subject.userId.length > 0) return subject.userId;
  throw new CheckoutError("no-user", "Checkout needs a user");
}
