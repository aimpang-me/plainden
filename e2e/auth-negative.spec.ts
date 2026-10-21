import { expect, test } from "@playwright/test";
import { readMagicLink, signIn } from "./tools-a/support";

test("a used magic link does not sign in again and sign-out clears the account", async ({ page, browser }) => {
  test.setTimeout(60_000);
  const email = `ada.${Date.now()}.${test.info().workerIndex}@example.com`;
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toHaveText("Check your email for a sign-in link.");
  const link = await readMagicLink(email);
  await page.goto(link);
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0);

  const fresh = await browser.newContext();
  try {
    const again = await fresh.newPage();
    await again.goto(link);
    await expect(again.getByLabel("Email")).toBeVisible();
    await expect(again.getByText(email)).toHaveCount(0);
  } finally {
    await fresh.close();
  }
});

test("sign-out from a session removes the email", async ({ page }) => {
  await signIn(page, test.info());
  const email = page.getByText(/@example\.com/);
  await expect(email).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText(/@example\.com/)).toHaveCount(0);
});
