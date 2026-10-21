import { spawn, type ChildProcess } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { signPaddleWebhook } from "../lib/payments/signature";
import { seedAllToolsPlan, signIn, webhookSecret } from "./tools-a/support";

const offPort = 3199;
let offServer: ChildProcess | undefined;

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000);
  offServer = spawn("npx", ["next", "dev", "--port", String(offPort)], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(offPort),
      CHECKOUT_ENABLED: "false",
      NEXT_DIST_DIR: ".next-checkout-off",
      PGLITE_DATA_DIR: ".data/pglite-checkout-off",
      BETTER_AUTH_URL: `http://127.0.0.1:${offPort}`,
    },
  });
  const deadline = Date.now() + 120_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${offPort}/pricing`);
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "fetch failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`checkout off server did not start: ${lastError}`);
});

test.afterAll(() => {
  const pid = offServer?.pid;
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    offServer?.kill("SIGTERM");
  }
});

test("a signed cancel downgrades a paid plan", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, test.info());
  const seeded = await seedAllToolsPlan(page);
  expect(await entitlement(page)).toEqual({ entitlementKey: "pdf", plan: "paid" });
  await page.goto("/account");
  await expect(page.locator("#content").getByText("All tools", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage billing" })).toBeVisible();
  await expect(page.getByText("Paid plan")).toBeVisible();
  const payload = {
    event_id: `evt_${crypto.randomUUID()}`,
    event_type: "subscription.canceled",
    occurred_at: new Date(Date.now() + 60_000).toISOString(),
    data: {
      id: seeded.subscriptionId,
      status: "canceled",
      customer_id: "ctm_e2e",
    },
  };
  const rawBody = JSON.stringify(payload);
  const response = await page.request.post("/api/paddle/webhook", {
    headers: { "paddle-signature": signPaddleWebhook(rawBody, webhookSecret, 1_700_000_000), "content-type": "application/json" },
    data: rawBody,
  });
  expect(response.status(), await response.text()).toBe(200);
  expect(await entitlement(page)).toEqual({ entitlementKey: "pdf", plan: "free" });
  await page.reload();
  await expect(page.locator("main").getByText("Free", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage billing" })).toHaveCount(0);
  await expect(page.getByText("Free plan")).toBeVisible();
});

test("a bad paddle signature is a 400", async ({ request }) => {
  const response = await request.post("/api/paddle/webhook", {
    headers: { "paddle-signature": "ts=1;h1=nope", "content-type": "application/json" },
    data: "{}",
  });
  expect(response.status()).toBe(400);
});

test("signed-out checkout redirects to the account page", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Checkout" }).first().click();
  await page.waitForURL("**/account");
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("the kill switch disables checkout", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${offPort}/pricing`);
  await expect(page.getByText("Checkout is turned off.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout" }).first()).toBeDisabled();
  await page.close();
});

async function entitlement(page: Page): Promise<unknown> {
  const response = await page.request.get("/api/entitlement?key=pdf");
  expect(response.ok()).toBeTruthy();
  return response.json();
}
