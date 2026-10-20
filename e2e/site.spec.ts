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
  await expect(page.getByRole("status")).toHaveText("free perMonth allows 3");
  await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
});

test("the landing page opens a tool that is not built yet", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "support@plainden.com" })).toHaveAttribute(
    "href",
    "mailto:support@plainden.com",
  );
  await page.getByRole("link", { name: "Privacy and terms generator" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy and terms generator" })).toBeVisible();
  await expect(page.getByText("This tool is not built yet.")).toBeVisible();
});

test("pricing lists the tool and bundle monthly prices", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("plainden_invoice_month")).toBeVisible();
  await expect(page.getByText("$5/mo").first()).toBeVisible();
  await expect(page.getByText("$9/mo")).toBeVisible();
});

test("the theme toggle switches to dark and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
