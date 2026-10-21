import { expect, test } from "@playwright/test";

test("health reports ok and declining cookies hides the banner after reload", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ ok: true });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("button", { name: "Decline" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
});
