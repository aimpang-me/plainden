import { expect, test } from "@playwright/test";
import { signPaddleWebhook } from "../lib/payments/signature";
import { openTool, seedAllToolsPlan, signIn, webhookSecret } from "./tools-a/support";

test("an unknown policy 404s, a republish keeps the link, and a canceled plan stays readable", async ({ page }) => {
  test.setTimeout(90_000);
  const missing = await page.request.get(`/p/${"ab".repeat(16)}`);
  expect(missing.status()).toBe(404);

  await openTool(page, "/privacy-policy-generator");
  await signIn(page, test.info());
  const seeded = await seedAllToolsPlan(page);
  const ready = page.waitForResponse((response) => response.url().includes("/api/entitlement") && response.ok());
  await openTool(page, "/privacy-policy-generator");
  await ready;
  await page.getByLabel("Business name").fill("Northwind Studio");
  await page.getByLabel("Contact email").fill("ada@example.com");
  await page.getByLabel("Website").fill("https://northwind.example");
  await page.getByLabel("Jurisdiction").selectOption("EU/UK");
  await page.getByLabel("Data collected").fill("We sell workshop tickets online.");
  await page.getByLabel("Purpose").fill("We sell workshop tickets online.");
  await page.getByLabel("Retention").fill("30 days");
  await page.getByRole("button", { name: "Publish" }).click();
  const hosted = page.getByRole("link", { name: /\/p\// });
  await expect(hosted).toBeVisible();
  const first = await hosted.getAttribute("href");
  expect(first).toMatch(/^\/p\/[0-9a-f]{32}$/);

  await page.getByLabel("Retention").fill("90 days");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(hosted).toHaveAttribute("href", first ?? "");
  await page.goto(first ?? "/");
  await expect(page.getByText("The data is kept for 90 days.")).toBeVisible();

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
  const signature = signPaddleWebhook(rawBody, webhookSecret, 1_700_000_000);
  const canceled = await page.request.post("/api/paddle/webhook", {
    headers: { "paddle-signature": signature, "content-type": "application/json" },
    data: rawBody,
  });
  expect(canceled.status(), await canceled.text()).toBe(200);

  const lapsed = page.waitForResponse(
    (response) => response.url().includes("/api/entitlement?key=legal") && response.ok(),
  );
  await openTool(page, "/privacy-policy-generator");
  expect(await (await lapsed).json()).toEqual({ entitlementKey: "legal", plan: "free" });
  await page.goto(first ?? "/");
  await expect(page.getByText("The data is kept for 90 days.")).toBeVisible();
  await expect(page.getByText("Northwind Studio")).toBeVisible();
});
