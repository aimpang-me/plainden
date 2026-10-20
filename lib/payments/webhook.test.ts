import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterEach, expect, test } from "vitest";
import { subscription, user } from "../../db/schema";
import { getDb } from "../db/client";
import { getEntitlement } from "../entitlements/get-entitlement";
import { prices, pricesToCreate } from "../pricing/catalog";
import { WebhookSignatureError } from "./errors";
import { createCheckout, handleWebhook } from "./index";

const dirs: string[] = [];
const webhookSecret = "whsec_plainden_test";
const stripe = new Stripe("sk_test_plainden_webhook_fixture");

afterEach(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("signed subscription events update the row and a replay does not duplicate or rewind it", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  await handleWebhook(signed(checkoutEvent("evt_checkout")));
  await handleWebhook(signed(checkoutEvent("evt_checkout")));
  expect(await rows(db)).toEqual([expect.objectContaining({ status: "active", priceLookupKey: "plainden_pdf_month" })]);
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "paid" });

  await handleWebhook(signed(subscriptionEvent("evt_updated", "customer.subscription.updated", "past_due", "plainden_pdf_year")));
  expect(await rows(db)).toEqual([
    expect.objectContaining({
      status: "past_due",
      priceLookupKey: "plainden_pdf_year",
      currentPeriodEnd: new Date(1_790_000_000_000),
    }),
  ]);
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });

  await handleWebhook(signed(checkoutEvent("evt_checkout_late")));
  expect((await rows(db))[0]?.status).toBe("past_due");

  await handleWebhook(signed(subscriptionEvent("evt_deleted", "customer.subscription.deleted", "canceled", "plainden_pdf_year")));
  expect((await rows(db))[0]?.status).toBe("canceled");
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });

  await handleWebhook(signed(invoiceFailed("evt_invoice")));
  expect((await rows(db))[0]?.status).toBe("past_due");
  await handleWebhook(signed(invoiceFailed("evt_invoice")));
  expect(await rows(db)).toHaveLength(1);
});

test("a bad webhook signature is rejected", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  await expect(handleWebhook({ rawBody: "{}", signature: "t=1,v1=nope" })).rejects.toBeInstanceOf(WebhookSignatureError);
});

test("checkout needs a user and an unknown price is refused when Stripe is configured", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_plainden_checkout_fixture";
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject: { deviceId: "dev_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).rejects.toThrow("Checkout needs a user");
  await expect(
    createCheckout({
      priceLookupKey: "plainden_missing",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).rejects.toThrow("Unknown price plainden_missing");
});

test("the price sync list keeps the paid catalog prices and drops the scaffold", () => {
  const created = pricesToCreate();
  expect(created.find((price) => price.lookupKey === "plainden_pdf_month")?.amountCents).toBe(500);
  expect(created.find((price) => price.lookupKey === "plainden_all_year")?.amountCents).toBe(9000);
  expect(created.some((price) => price.lookupKey === "plainden_scaffold_month")).toBe(false);
  expect(created).toHaveLength(prices.filter((price) => price.amountCents > 0).length);
});

function signed(payload: unknown): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  return {
    rawBody,
    signature: stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret: webhookSecret }),
  };
}

function checkoutEvent(id: string) {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        object: "checkout.session",
        customer: "cus_1",
        subscription: "sub_1",
        mode: "subscription",
        payment_status: "paid",
        metadata: {
          userId: "user_1",
          entitlementKey: "pdf",
          priceLookupKey: "plainden_pdf_month",
        },
      },
    },
  };
}

function subscriptionEvent(id: string, type: string, status: string, lookupKey: string) {
  return {
    id,
    object: "event",
    type,
    data: {
      object: {
        id: "sub_1",
        object: "subscription",
        customer: "cus_1",
        status,
        metadata: {
          userId: "user_1",
          entitlementKey: "pdf",
          priceLookupKey: lookupKey,
        },
        items: {
          object: "list",
          data: [
            {
              id: "si_1",
              object: "subscription_item",
              current_period_end: 1_790_000_000,
              price: { id: "price_1", object: "price", lookup_key: lookupKey },
            },
          ],
        },
      },
    },
  };
}

function invoiceFailed(id: string) {
  return {
    id,
    object: "event",
    type: "invoice.payment_failed",
    data: {
      object: {
        id: "in_1",
        object: "invoice",
        customer: "cus_1",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: "sub_1",
            metadata: {
              userId: "user_1",
              entitlementKey: "pdf",
              priceLookupKey: "plainden_pdf_month",
            },
          },
        },
      },
    },
  };
}

async function rows(db: Awaited<ReturnType<typeof getDb>>) {
  return db.select().from(subscription).where(eq(subscription.userId, "user_1"));
}

async function insertUser(db: Awaited<ReturnType<typeof getDb>>) {
  const now = new Date("2026-10-20T00:00:00.000Z");
  await db.insert(user).values({
    id: "user_1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function freshDb() {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-"));
  dirs.push(dir);
  process.env.PGLITE_DATA_DIR = dir;
  return getDb();
}
