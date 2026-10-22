import { expect, test } from "@playwright/test";

test("the landing page lists every tool and a direct legal url opens the generator", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "support@plainden.com" })).toHaveAttribute(
    "href",
    "mailto:support@plainden.com",
  );
  await expect(page.getByRole("heading", { level: 1, name: "Small tools that run in the browser" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("link", { name: "Refunds", exact: true })).toHaveAttribute("href", "/refund");
  await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
  for (const name of [
    "Invoice generator",
    "Receipt maker",
    "Receipt generator",
    "Privacy and terms",
    "Privacy and terms generator",
    "PDF tools",
    "QR code",
    "QR code generator",
    "Image tools",
    "Video compressor",
    "Data converter",
    "Subtitles",
    "Subtitle converter",
    "Cookie and refund",
    "Cookie and refund policy generator",
  ]) {
    await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Open billing portal" })).toHaveCount(0);
  await expect(page.getByText("Free plan").first()).toBeVisible();
});

test("the theme toggle switches to dark and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
