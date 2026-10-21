import { expect, test } from "@playwright/test";

test("scaffold check blocks a count of 4 and allows a count of 1", async ({ page }) => {
  await page.goto("/scaffold-check");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Scaffold check" })).toBeVisible();
  await page.getByLabel("Note").fill("Hello");
  await page.getByLabel("Count").fill("1");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Allowed on the free plan. Format text. Note Hello. Slug scaffold-check.",
  );
  await page.getByLabel("Count").fill("4");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toHaveText("The free plan allows a count of 3.");
  await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
});

test("the landing page hides later waves and a direct legal url opens the generator", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "support@plainden.com" })).toHaveAttribute(
    "href",
    "mailto:support@plainden.com",
  );
  await expect(page.getByRole("link", { name: "Invoice generator" })).toBeVisible();
  await expect(page.getByRole("link", { name: "PDF tools" })).toBeVisible();
  await expect(page.getByRole("link", { name: "QR code generator" })).toBeVisible();
  for (const name of [
    "Privacy and terms generator",
    "Image tools",
    "Video compressor",
    "Data converter",
    "Subtitle converter",
    "Cookie and refund policy generator",
    "Receipt generator",
  ]) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
  await page.goto("/privacy-policy-generator");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy generator" })).toBeVisible();
  await expect(page.getByText("This tool is not built yet.")).toHaveCount(0);
  await expect(page.getByLabel("Business name")).toBeVisible();
});

test("pricing shows three plans and keeps checkout keys off the page", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
  await expect(page.getByText("3 invoices or receipts a month")).toBeVisible();
  await expect(page.getByText("Receipt is included with Invoice generator.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "One tool" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All tools" })).toBeVisible();
  await expect(page.getByText("Recommended")).toBeVisible();
  await expect(page.getByText("two months free")).toBeVisible();
  await expect(page.getByText("$5/mo").first()).toBeVisible();
  await expect(page.getByText("$9/mo")).toBeVisible();
  await expect(page.getByText("plainden_invoice_month")).toHaveCount(0);
  await expect(page.getByText("plainden_scaffold_month")).toHaveCount(0);

  const toolForm = page.locator("form").filter({ has: page.getByLabel("Tool") });
  await expect(toolForm.locator("input[name=lookupKey]")).toHaveValue("plainden_invoice_month");
  await page.getByLabel("Tool").selectOption("qr");
  await page.getByRole("radio", { name: "Annual" }).check();
  await expect(page.getByRole("radio", { name: "Annual" })).toBeChecked();
  await expect(toolForm.locator("input[name=lookupKey]")).toHaveValue("plainden_qr_year");
  await expect(page.getByText("$50/yr").first()).toBeVisible();
  await expect(page.getByText("$90/yr")).toBeVisible();
  const bundleKey = page
    .locator("li")
    .filter({ has: page.getByRole("heading", { name: "All tools" }) })
    .locator("input[name=lookupKey]");
  await expect(bundleKey).toHaveValue("plainden_all_year");
  await expect(page.getByRole("button", { name: "Checkout" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Open billing portal" })).toBeVisible();
});

test("the theme toggle switches to dark and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
