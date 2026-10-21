import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";
import { subscription, user } from "../../db/schema";
import { getDb } from "../db/client";
import { CheckoutError, checkoutErrorCopy } from "./errors";
import { createCheckout, createPortal } from "./index";

const dirs: string[] = [];

afterEach(async () => {
  delete process.env.PADDLE_API_KEY;
  delete process.env.PADDLE_PRICE_MONTHLY;
  delete process.env.PADDLE_PRICE_YEARLY;
  delete process.env.NEXT_PUBLIC_PADDLE_ENV;
  delete process.env.CHECKOUT_ENABLED;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.BETTER_AUTH_URL;
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
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
  const calls: Array<{ url: string; body: unknown; authorization: string; idempotencyKey: string | null }> = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      authorization: String(new Headers(init.headers).get("authorization")),
      idempotencyKey: new Headers(init.headers).get("idempotency-key"),
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
          priceLookupKey: "plainden_pdf_year",
        },
        customer: { email: "ada@example.com" },
      },
      idempotencyKey: null,
    },
  ]);
});

test("checkout reuses one customer, blocks an open subscription, and fails closed when billing is off or the site URL is unset", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    if (method === "GET") return Response.json({ data: [] });
    const body = JSON.parse(String(init.body));
    calls.push({ method, url: String(url), body });
    if (method === "PATCH") return Response.json({ data: { id: "txn_1", status: "canceled" } });
    const id = calls.filter((call) => call.method === "POST").length === 1 ? "txn_1" : "txn_year";
    return Response.json({ data: { id, customer_id: "ctm_saved" } });
  });
  const month = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  await expect(createCheckout(month)).resolves.toEqual({ transactionId: "txn_1" });
  await expect(createCheckout(month)).resolves.toEqual({ transactionId: "txn_1" });
  expect(calls).toEqual([
    expect.objectContaining({ method: "POST", body: expect.objectContaining({ customer: { email: "ada@example.com" } }) }),
  ]);
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  await expect(createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" })).resolves.toEqual({
    transactionId: "txn_year",
  });
  expect(calls[1]).toEqual({
    method: "PATCH",
    url: "https://sandbox-api.paddle.com/transactions/txn_1",
    body: { status: "canceled" },
  });
  expect(calls[2]).toEqual(
    expect.objectContaining({ method: "POST", body: expect.objectContaining({ customer_id: "ctm_saved" }) }),
  );
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
  expect(calls).toHaveLength(3);
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

test("manage billing opens the active subscription, not the customer overview", async () => {
  const db = await freshDb();
  await insertUser(db);
  await db.update(user).set({ providerCustomerId: "ctm_saved" }).where(eq(user.id, "user_1"));
  const now = new Date("2026-10-20T00:00:00.000Z");
  await db.insert(subscription).values([
    {
      id: "sub_old",
      userId: "user_1",
      entitlementKey: "invoice",
      status: "canceled",
      priceLookupKey: "plainden_invoice_month",
      providerCustomerId: "ctm_saved",
      providerSubscriptionId: "sub_old",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sub_live",
      userId: "user_1",
      entitlementKey: "pdf",
      status: "active",
      priceLookupKey: "plainden_pdf_month",
      providerCustomerId: "ctm_saved",
      providerSubscriptionId: "sub_live",
      createdAt: now,
      updatedAt: now,
    },
  ]);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const calls: unknown[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(
      JSON.stringify({
        data: {
          urls: {
            general: { overview: "https://sandbox-customer-portal.paddle.com/overview" },
            subscriptions: [
              {
                id: "sub_live",
                view_subscription: "https://sandbox-customer-portal.paddle.com/subscriptions/sub_live",
                cancel_subscription: "https://sandbox-customer-portal.paddle.com/subscriptions/sub_live/cancel",
              },
            ],
          },
        },
      }),
      { status: 200 },
    );
  });
  await expect(createPortal({ subject: { userId: "user_1" }, returnPath: "/account" })).resolves.toEqual({
    url: "https://sandbox-customer-portal.paddle.com/subscriptions/sub_live",
  });
  expect(calls).toEqual([{ subscription_ids: ["sub_live"] }]);
});

test("a second checkout reuses the open Paddle transaction and a live Paddle subscription blocks it", async () => {
  const db = await freshDb();
  await insertUser(db);
  await db.update(user).set({ providerCustomerId: "ctm_saved" }).where(eq(user.id, "user_1"));
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  let liveSubscriptions: unknown[] = [];
  const posts: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (init.method === "POST") {
      posts.push(url);
      return Response.json({ data: { id: "txn_new" } });
    }
    if (url.includes("/subscriptions?")) return Response.json({ data: liveSubscriptions });
    return Response.json({ data: [{ id: "txn_open", status: "ready", items: [{ price: { id: "pri_month" }, quantity: 1 }] }] });
  });
  const input = { priceLookupKey: "plainden_pdf_month", subject: { userId: "user_1" }, successPath: "/account", cancelPath: "/pricing" };
  await expect(createCheckout(input)).resolves.toEqual({ transactionId: "txn_open" });
  expect(posts).toEqual([]);
  liveSubscriptions = [{ id: "sub_paddle", status: "active" }];
  await expect(createCheckout(input)).rejects.toMatchObject({ code: "already-subscribed" });
  expect(posts).toEqual([]);
});

test("two concurrent checkouts for a new user create one Paddle transaction", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  let releaseFirst: () => void = () => {};
  const holdFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (init.method !== "POST") return Response.json({ data: [] });
    posts.push(url);
    if (posts.length === 1) await holdFirst;
    return Response.json({ data: { id: "txn_race", customer_id: "ctm_race" } });
  });
  const input = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  const pending = Promise.all([createCheckout(input), createCheckout(input)]);
  const started = Date.now();
  while (posts.length === 0 && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await new Promise((resolve) => setTimeout(resolve, 40));
  releaseFirst();
  await expect(pending).resolves.toEqual([
    { transactionId: "txn_race" },
    { transactionId: "txn_race" },
  ]);
  expect(posts).toEqual(["https://sandbox-api.paddle.com/transactions"]);
});

test("a second price is refused while one checkout is open", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  let releaseFirst: () => void = () => {};
  const holdFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (init.method === "PATCH") {
      posts.push(url);
      return Response.json({ data: { id: "txn_month", status: "canceled" } });
    }
    if (init.method !== "POST") return Response.json({ data: [] });
    posts.push(url);
    if (posts.length === 1) await holdFirst;
    const id = posts.filter((item) => item.endsWith("/transactions")).length === 1 ? "txn_month" : "txn_year";
    return Response.json({ data: { id, customer_id: "ctm_race" } });
  });
  const month = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  const pending = createCheckout(month);
  const started = Date.now();
  while (posts.length === 0 && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const year = await createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" }).catch((error: unknown) => error);
  expect(year).toBeInstanceOf(CheckoutError);
  expect((year as CheckoutError).code).toBe("open-checkout");
  expect(checkoutErrorCopy(year)).toBe("Finish or cancel your open checkout first.");
  expect(posts).toEqual(["https://sandbox-api.paddle.com/transactions"]);
  releaseFirst();
  await expect(pending).resolves.toEqual({ transactionId: "txn_month" });
  await expect(createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" })).resolves.toEqual({
    transactionId: "txn_year",
  });
  expect(posts).toEqual([
    "https://sandbox-api.paddle.com/transactions",
    "https://sandbox-api.paddle.com/transactions/txn_month",
    "https://sandbox-api.paddle.com/transactions",
  ]);
});

test("a paid transaction is not canceled when the price changes", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    if (method === "GET" && String(url).endsWith("/transactions/txn_paid")) {
      return Response.json({ data: { id: "txn_paid", status: "completed" } });
    }
    if (method === "GET") return Response.json({ data: [] });
    posts.push(`${method} ${url}`);
    if (method === "PATCH") return new Response("already completed", { status: 409 });
    return Response.json({ data: { id: "txn_paid", customer_id: "ctm_paid" } });
  });
  const month = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  await expect(createCheckout(month)).resolves.toEqual({ transactionId: "txn_paid" });
  const year = await createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" }).catch((error: unknown) => error);
  expect(year).toBeInstanceOf(CheckoutError);
  expect((year as CheckoutError).code).toBe("open-checkout");
  expect(posts).toEqual([
    "POST https://sandbox-api.paddle.com/transactions",
    "PATCH https://sandbox-api.paddle.com/transactions/txn_paid",
  ]);
});

test("a canceled transaction can be replaced with the other price", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    if (method === "GET" && String(url).endsWith("/transactions/txn_old")) {
      return Response.json({ data: { id: "txn_old", status: "canceled" } });
    }
    if (method === "GET") return Response.json({ data: [] });
    posts.push(`${method} ${url}`);
    if (method === "PATCH") return new Response("already canceled", { status: 409 });
    const id = posts.filter((item) => item.startsWith("POST")).length === 1 ? "txn_old" : "txn_year";
    return Response.json({ data: { id, customer_id: "ctm_old" } });
  });
  const month = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  await expect(createCheckout(month)).resolves.toEqual({ transactionId: "txn_old" });
  await expect(createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" })).resolves.toEqual({
    transactionId: "txn_year",
  });
  expect(posts).toEqual([
    "POST https://sandbox-api.paddle.com/transactions",
    "PATCH https://sandbox-api.paddle.com/transactions/txn_old",
    "POST https://sandbox-api.paddle.com/transactions",
  ]);
});

test("a checkout that loses its intent does not return the orphan transaction", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    if (method === "GET") return Response.json({ data: { id: "txn_orphan", status: "canceled" } });
    posts.push(`${method} ${url}`);
    if (method === "PATCH") return Response.json({ data: { id: "txn_orphan", status: "canceled" } });
    await db.execute(sql`UPDATE "checkout_intents" SET "id" = 'replaced' WHERE "userId" = 'user_1'`);
    return Response.json({ data: { id: "txn_orphan", customer_id: "ctm_orphan" } });
  });
  const failure = await createCheckout({
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  }).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(CheckoutError);
  expect((failure as CheckoutError).code).toBe("upstream");
  expect(checkoutErrorCopy(failure)).toBe("Checkout could not start. Try again.");
  expect(posts).toEqual([
    "POST https://sandbox-api.paddle.com/transactions",
    "PATCH https://sandbox-api.paddle.com/transactions/txn_orphan",
  ]);
  const left = await db.execute(sql`SELECT "id", "transactionId" FROM "checkout_intents"`);
  expect(left.rows).toEqual([{ id: "replaced", transactionId: null }]);
});

test("a hung Paddle call stops within twenty seconds and releases the checkout", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
    if (ms !== 20_000) throw new Error(`Paddle timeout is ${ms}`);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 0);
    return controller.signal;
  });
  let calls = 0;
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
    calls += 1;
    if (calls > 1) return Promise.resolve(Response.json({ data: { id: "txn_after", customer_id: "ctm_after" } }));
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted", "AbortError"));
      });
    });
  });
  const input = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  try {
    const failure = await createCheckout(input).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CheckoutError);
    expect((failure as CheckoutError).code).toBe("upstream");
    expect(timeout).toHaveBeenCalledWith(20_000);
  } finally {
    timeout.mockRestore();
  }
  await expect(createCheckout(input)).resolves.toEqual({ transactionId: "txn_after" });
});

test("a price switch does not hand the old transaction to a concurrent request", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.PADDLE_PRICE_YEARLY = "pri_year";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  let releaseCancel: () => void = () => {};
  const holdCancel = new Promise<void>((resolve) => {
    releaseCancel = resolve;
  });
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    if (method === "GET") return Response.json({ data: [] });
    calls.push(`${method} ${url}`);
    if (method === "PATCH") {
      await holdCancel;
      return Response.json({ data: { id: "txn_month", status: "canceled" } });
    }
    const id = calls.filter((item) => item.startsWith("POST")).length === 1 ? "txn_month" : "txn_year";
    return Response.json({ data: { id, customer_id: "ctm_switch" } });
  });
  const month = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  await expect(createCheckout(month)).resolves.toEqual({ transactionId: "txn_month" });
  const year = createCheckout({ ...month, priceLookupKey: "plainden_pdf_year" });
  const started = Date.now();
  while (!calls.some((item) => item.startsWith("PATCH")) && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const again = await createCheckout(month).catch((error: unknown) => error);
  expect(again).toBeInstanceOf(CheckoutError);
  expect((again as CheckoutError).code).toBe("open-checkout");
  expect(checkoutErrorCopy(again)).toBe("Finish or cancel your open checkout first.");
  releaseCancel();
  await expect(year).resolves.toEqual({ transactionId: "txn_year" });
  expect(calls.filter((item) => item.startsWith("POST"))).toEqual([
    "POST https://sandbox-api.paddle.com/transactions",
    "POST https://sandbox-api.paddle.com/transactions",
  ]);
});

test("an expired unbound checkout is taken over with a one minute lease", async () => {
  const db = await freshDb();
  await insertUser(db);
  await db.execute(sql`
    INSERT INTO "checkout_intents" ("id", "userId", "priceLookupKey", "createdAt", "expiresAt")
    VALUES ('intent_stale', 'user_1', 'plainden_pdf_month', now() - interval '2 minutes', now() - interval '1 second')
  `);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  let claimLeaseSeconds = 0;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (init.method !== "POST") return Response.json({ data: [] });
    posts.push(url);
    const lease = await db.execute(sql`
      SELECT EXTRACT(EPOCH FROM ("expiresAt" - now())) AS "seconds" FROM "checkout_intents" WHERE "transactionId" IS NULL
    `);
    claimLeaseSeconds = Number((lease.rows[0] as { seconds: string | number }).seconds);
    return Response.json({ data: { id: "txn_taken", customer_id: "ctm_taken" } });
  });
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).resolves.toEqual({ transactionId: "txn_taken" });
  expect(posts).toEqual(["https://sandbox-api.paddle.com/transactions"]);
  expect(claimLeaseSeconds).toBeGreaterThan(30);
  expect(claimLeaseSeconds).toBeLessThan(90);
  const bound = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM ("expiresAt" - now())) AS "seconds" FROM "checkout_intents"
  `);
  const boundSeconds = Number((bound.rows[0] as { seconds: string | number }).seconds);
  expect(boundSeconds).toBeGreaterThan(20 * 60);
  expect(boundSeconds).toBeLessThan(40 * 60);
});

test("an open claim expires in about a minute, and a waiter does not poll every tick", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  process.env.NEXT_PUBLIC_PADDLE_ENV = "sandbox";
  const posts: string[] = [];
  let releaseFirst: () => void = () => {};
  const holdFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const execute = db.execute.bind(db);
  let intentReads = 0;
  db.execute = (async (query: Parameters<typeof execute>[0]) => {
    const rendered = sqlText(query);
    if (rendered.includes("checkout_intents")) intentReads += 1;
    return execute(query);
  }) as typeof db.execute;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (init.method !== "POST") return Response.json({ data: [] });
    posts.push(url);
    if (posts.length === 1) {
      const lease = await db.execute(sql`
        SELECT EXTRACT(EPOCH FROM ("expiresAt" - now())) AS "seconds" FROM "checkout_intents"
      `);
      const seconds = Number((lease.rows[0] as { seconds: string | number }).seconds);
      expect(seconds).toBeGreaterThan(30);
      expect(seconds).toBeLessThan(90);
      await holdFirst;
    }
    return Response.json({ data: { id: "txn_held", customer_id: "ctm_held" } });
  });
  const input = {
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  };
  const pending = Promise.all([createCheckout(input), createCheckout(input)]);
  const started = Date.now();
  while (posts.length === 0 && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const before = intentReads;
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(intentReads - before).toBeGreaterThan(0);
  expect(intentReads - before).toBeLessThan(8);
  releaseFirst();
  await expect(pending).resolves.toEqual([{ transactionId: "txn_held" }, { transactionId: "txn_held" }]);
});

test("checkout failures carry a code and the browser sees safe copy", async () => {
  const db = await freshDb();
  await insertUser(db);
  process.env.PADDLE_API_KEY = "pdl_test_plainden_checkout_fixture";
  process.env.PADDLE_PRICE_MONTHLY = "pri_month";
  vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
  const failure = await createCheckout({
    priceLookupKey: "plainden_pdf_month",
    subject: { userId: "user_1" },
    successPath: "/account",
    cancelPath: "/pricing",
  }).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(CheckoutError);
  expect((failure as CheckoutError).code).toBe("upstream");
  expect(checkoutErrorCopy(failure)).toBe("Checkout could not start. Try again.");
  expect(checkoutErrorCopy(new CheckoutError("off", "Checkout is turned off."))).toBe("Checkout is turned off.");
  expect(checkoutErrorCopy(new Error("relation subscriptions does not exist"))).toBe("Checkout could not start.");
  vi.stubGlobal("fetch", async () => Response.json({ data: { id: "txn_retry", customer_id: "ctm_retry" } }));
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject: { userId: "user_1" },
      successPath: "/account",
      cancelPath: "/pricing",
    }),
  ).resolves.toEqual({ transactionId: "txn_retry" });
});

function sqlText(query: unknown): string {
  if (!query || typeof query !== "object" || !("queryChunks" in query)) return "";
  const chunks = (query as { queryChunks: unknown[] }).queryChunks;
  return chunks
    .map((chunk) => {
      if (!chunk || typeof chunk !== "object" || !("value" in chunk)) return "";
      const value = (chunk as { value: unknown }).value;
      return Array.isArray(value) ? value.join("") : "";
    })
    .join("");
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
