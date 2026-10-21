import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";
import { subscription, user } from "../../db/schema";
import { getDb } from "../db/client";
import { getEntitlement } from "../entitlements/get-entitlement";
import { prices, pricesToCreate } from "../pricing/catalog";
import { WebhookSignatureError } from "./errors";
import { accountPlanCopy } from "./account-plan";
import { createCheckout, createPortal, handleWebhook } from "./index";
import { applyForNotification } from "./subscription";

const dirs: string[] = [];
const webhookSecret = "pdl_whsec_plainden_test";
const periodEnd = "2020-01-01T00:00:00.000Z";

afterEach(async () => {
  delete process.env.PADDLE_WEBHOOK_SECRET;
  delete process.env.PADDLE_API_KEY;
  delete process.env.PADDLE_PRICE_MONTHLY;
  delete process.env.PADDLE_PRICE_YEARLY;
  delete process.env.NEXT_PUBLIC_PADDLE_ENV;
  delete process.env.CHECKOUT_ENABLED;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.BETTER_AUTH_URL;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("signed subscription events update the row and a replay does not duplicate or rewind it", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;

  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  expect(await rows(db)).toEqual([expect.objectContaining({ status: "active", priceLookupKey: "plainden_pdf_month" })]);
  expect(await db.select({ providerCustomerId: user.providerCustomerId }).from(user)).toEqual([{ providerCustomerId: "ctm_1" }]);
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "paid" });

  await handleWebhook(signed(subscriptionEvent("evt_updated", "subscription.updated", "past_due", "plainden_pdf_year", "2026-01-01T00:00:20.000Z")));
  expect(await rows(db)).toEqual([
    expect.objectContaining({
      status: "past_due",
      priceLookupKey: "plainden_pdf_year",
      currentPeriodEnd: new Date(periodEnd),
    }),
  ]);
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });

  await handleWebhook(signed(transactionEvent("evt_checkout_late", "2026-01-01T00:00:30.000Z")));
  expect((await rows(db))[0]?.status).toBe("past_due");

  await handleWebhook(signed(subscriptionEvent("evt_canceled", "subscription.canceled", "canceled", "plainden_pdf_year", "2026-01-01T00:00:40.000Z")));
  expect((await rows(db))[0]?.status).toBe("canceled");
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });

  await handleWebhook(signed(subscriptionEvent("evt_due", "subscription.past_due", "past_due", "plainden_pdf_month", "2026-01-01T00:00:50.000Z")));
  expect((await rows(db))[0]?.status).toBe("past_due");
  await handleWebhook(signed(subscriptionEvent("evt_due", "subscription.past_due", "past_due", "plainden_pdf_month", "2026-01-01T00:00:50.000Z")));
  expect(await rows(db)).toHaveLength(1);
});

test("a price change recomputes entitlement and an older event does not rewind the row", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  await handleWebhook(signed(subscriptionEvent("evt_all", "subscription.activated", "active", "plainden_all_month", "2026-01-01T00:00:20.000Z")));
  expect((await rows(db))[0]).toEqual(
    expect.objectContaining({ entitlementKey: "all", priceLookupKey: "plainden_all_month", status: "active" }),
  );
  await handleWebhook(signed(subscriptionEvent("evt_same", "subscription.updated", "past_due", "plainden_all_month", "2026-01-01T00:00:20.000Z")));
  expect((await rows(db))[0]?.status).toBe("past_due");
  await handleWebhook(signed(subscriptionEvent("evt_old", "subscription.canceled", "canceled", "plainden_pdf_month", "2026-01-01T00:00:10.000Z")));
  expect((await rows(db))[0]).toEqual(
    expect.objectContaining({ entitlementKey: "all", priceLookupKey: "plainden_all_month", status: "past_due" }),
  );
});

test("a bad webhook signature is rejected and a second h1 can match", async () => {
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await expect(handleWebhook({ rawBody: "{}", signature: "ts=1;h1=nope" })).rejects.toBeInstanceOf(WebhookSignatureError);
  const rawBody = JSON.stringify(transactionEvent("evt_sig", "2026-01-01T00:00:05.000Z"));
  const db = await freshDb();
  await insertUser(db);
  await handleWebhook({ rawBody, signature: `ts=1700000000;h1=deadbeef;h1=${hmac(rawBody, 1700000000)}` });
  expect((await rows(db))[0]?.status).toBe("active");
});

test("checkout needs a user and an unknown price is refused when Paddle is configured", async () => {
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
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

test("checkout opens a sandbox transaction with the user id in custom data", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const calls: Array<{ url: string; body: unknown; authorization: string }> = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      authorization: String(new Headers(init.headers).get("authorization")),
    });
    return new Response(JSON.stringify({ data: { id: "txn_1" } }), { status: 200 });
  });
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_year",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).resolves.toEqual({ transactionId: "txn_1" });
  expect(calls).toEqual([
    {
      url: "https://sandbox-api.paddle.com/transactions",
      authorization: "Bearer pdl_test_plainden_checkout_fixture",
      body: {
        items: [{ price_id: "pri_year", quantity: 1 }],
        custom_data: {
          userId: "user_1",
          entitlementKey: "pdf",
          priceLookupKey: "plainden_pdf_year",
        },
        customer: { email: "ada@example.com" },
      },
    },
  ]);
});

test("past_due stays paid inside the grace window and a duplicate event id does not apply twice", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  await handleWebhook(
    signed(subscriptionEvent("evt_due", "subscription.past_due", "past_due", "plainden_pdf_month", "2026-01-01T00:00:20.000Z", "2099-01-01T00:00:00.000Z")),
  );
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "paid" });
  await handleWebhook(
    signed(subscriptionEvent("evt_due", "subscription.canceled", "canceled", "plainden_pdf_month", "2026-01-01T00:00:40.000Z")),
  );
  expect((await rows(db))[0]?.status).toBe("past_due");
});

test("an unpaid subscription create does not grant access, and pause, resume, refund, and chargeback are explicit", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await handleWebhook(signed(subscriptionEvent("evt_created", "subscription.created", "active", "plainden_pdf_month", "2026-01-01T00:00:05.000Z")));
  expect(await rows(db)).toEqual([]);
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });
  await handleWebhook(signed(transactionEvent("evt_paid", "2026-01-01T00:00:10.000Z")));
  expect((await rows(db))[0]?.status).toBe("active");
  await handleWebhook(signed(subscriptionEvent("evt_paused", "subscription.paused", "paused", "plainden_pdf_month", "2026-01-01T00:00:20.000Z")));
  expect((await rows(db))[0]?.status).toBe("paused");
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });
  await handleWebhook(signed(subscriptionEvent("evt_resumed", "subscription.resumed", "active", "plainden_pdf_month", "2026-01-01T00:00:30.000Z")));
  expect((await rows(db))[0]?.status).toBe("active");
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "paid" });
  await handleWebhook(signed(adjustmentEvent("evt_refund", "adjustment.created", "refund", "approved")));
  expect((await rows(db))[0]?.status).toBe("canceled");
  expect(await getEntitlement({ userId: "user_1" }, "pdf")).toEqual({ entitlementKey: "pdf", plan: "free" });
  await handleWebhook(signed(subscriptionEvent("evt_back", "subscription.activated", "active", "plainden_pdf_month", "2026-01-01T00:00:50.000Z")));
  await handleWebhook(signed(adjustmentEvent("evt_reverse", "adjustment.updated", "refund", "reversed", "2026-01-01T00:00:55.000Z")));
  expect((await rows(db))[0]?.status).toBe("active");
  await handleWebhook(signed(adjustmentEvent("evt_chargeback", "adjustment.updated", "chargeback", "approved", "2026-01-01T00:01:00.000Z")));
  expect((await rows(db))[0]?.status).toBe("canceled");
});

test("checkout reuses one customer, blocks an open subscription, and fails closed when billing is off or the site URL is unset", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const calls: unknown[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ data: { id: "txn_1", customer_id: "ctm_saved" } }), { status: 200 });
  });
  await createCheckout({
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  });
  await createCheckout({
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  });
  expect(calls[0]).toEqual(expect.objectContaining({ customer: { email: "ada@example.com" } }));
  expect(calls[1]).toEqual(expect.objectContaining({ customer_id: "ctm_saved" }));
  await db.insert(subscription).values({
    id: "sub_open",
    userId: "user_1",
    entitlementKey: "pdf",
    status: "active",
    priceLookupKey: "plainden_pdf_month",
    providerCustomerId: "ctm_saved",
    providerSubscriptionId: "sub_open",
    createdAt: new Date("2026-10-20T00:00:00.000Z"),
    updatedAt: new Date("2026-10-20T00:00:00.000Z"),
  });
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).rejects.toThrow("You already have a subscription. Manage billing to change it.");
  expect(calls).toHaveLength(2);
  process.env.CHECKOUT_ENABLED = "false";
  await expect(createPortal({ subject: { userId: "user_1" }, returnPath: "/account" })).rejects.toThrow("Checkout is turned off.");
  delete process.env.CHECKOUT_ENABLED;
  vi.stubEnv("NODE_ENV", "production");
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.BETTER_AUTH_URL;
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).rejects.toThrow("Site URL is not configured");
});

test("a portal cancel keeps the price and records when Pro ends", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  const scheduled = subscriptionEvent(
    "evt_schedule",
    "subscription.updated",
    "active",
    "plainden_pdf_month",
    "2026-01-01T00:00:20.000Z",
    "2026-11-21T00:00:00.000Z",
  );
  delete scheduled.data.custom_data;
  scheduled.data.scheduled_change = { action: "cancel", effective_at: "2026-11-21T00:00:00.000Z" };
  expect(applyForNotification(scheduled)).toMatchObject({
    kind: "replace",
    scheduledCancel: { kind: "cancel", effectiveAt: new Date("2026-11-21T00:00:00.000Z") },
  });
  await handleWebhook(signed(scheduled));
  const cancelAt = new Date("2026-11-21T00:00:00.000Z");
  expect((await rows(db))[0]).toEqual(expect.objectContaining({ status: "active", cancelAt }));
  expect(
    accountPlanCopy(
      [
        {
          entitlementKey: "pdf",
          status: "active",
          currentPeriodEnd: cancelAt,
          cancelAt,
        },
      ],
      new Date("2026-10-21T00:00:00.000Z"),
    ),
  ).toEqual({ plan: "One tool", ends: "Pro ends November 21, 2026" });
  const cleared = subscriptionEvent(
    "evt_clear",
    "subscription.updated",
    "active",
    "plainden_pdf_month",
    "2026-01-01T00:00:30.000Z",
    "2026-11-21T00:00:00.000Z",
  );
  delete cleared.data.custom_data;
  cleared.data.scheduled_change = null;
  await handleWebhook(signed(cleared));
  expect((await rows(db))[0]).toEqual(expect.objectContaining({ status: "active", cancelAt: null }));
});

test("a price change to all tools replaces a stale one-tool entitlement", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
  await handleWebhook(signed(transactionEvent("evt_checkout", "2026-01-01T00:00:05.000Z")));
  await handleWebhook(
    signed(subscriptionEvent("evt_upgrade", "subscription.updated", "active", "plainden_all_month", "2026-01-01T00:00:20.000Z", periodEnd, "pdf")),
  );
  expect((await rows(db))[0]).toEqual(
    expect.objectContaining({ entitlementKey: "all", priceLookupKey: "plainden_all_month", status: "active" }),
  );
});

test("the price list keeps the paid catalog prices and drops the scaffold", () => {
  const created = pricesToCreate();
  expect(created.find((price) => price.lookupKey === "plainden_pdf_month")?.amountCents).toBe(500);
  expect(created.find((price) => price.lookupKey === "plainden_all_year")?.amountCents).toBe(9000);
  expect(created.some((price) => price.lookupKey === "plainden_scaffold_month")).toBe(false);
  expect(created).toHaveLength(prices.filter((price) => price.amountCents > 0).length);
});

function hmac(rawBody: string, ts: number): string {
  return createHmac("sha256", webhookSecret).update(`${ts}:${rawBody}`).digest("hex");
}

function signed(payload: unknown): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  const ts = 1700000000;
  return { rawBody, signature: `ts=${ts};h1=${hmac(rawBody, ts)}` };
}

function transactionEvent(id: string, occurredAt: string) {
  return {
    event_id: id,
    event_type: "transaction.completed",
    occurred_at: occurredAt,
    data: {
      id: "txn_1",
      customer_id: "ctm_1",
      subscription_id: "sub_1",
      custom_data: {
        userId: "user_1",
        entitlementKey: "pdf",
        priceLookupKey: "plainden_pdf_month",
      },
    },
  };
}

function adjustmentEvent(id: string, eventType: string, action: string, status: string, occurredAt = "2026-01-01T00:00:40.000Z") {
  return {
    event_id: id,
    event_type: eventType,
    occurred_at: occurredAt,
    data: {
      id: "adj_1",
      action,
      status,
      subscription_id: "sub_1",
      customer_id: "ctm_1",
    },
  };
}

function subscriptionEvent(
  id: string,
  eventType: string,
  status: string,
  lookupKey: string,
  occurredAt: string,
  endsAt = periodEnd,
  entitlementKey = lookupKey.includes("_all_") ? "all" : "pdf",
) {
  return {
    event_id: id,
    event_type: eventType,
    occurred_at: occurredAt,
    data: {
      id: "sub_1",
      status,
      customer_id: "ctm_1",
      custom_data: {
        userId: "user_1",
        entitlementKey,
        priceLookupKey: lookupKey,
      },
      current_billing_period: { ends_at: endsAt },
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
