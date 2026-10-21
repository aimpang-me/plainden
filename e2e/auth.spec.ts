import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { mailDir } from "./env";

test("a magic link from the account page signs in", async ({ page }) => {
  const email = `ada.${Date.now()}@example.com`;
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toHaveText("Check your email for a sign-in link.");
  const link = await readMagicLink(email);
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

async function readMagicLink(email: string): Promise<string> {
  const dir = path.resolve(mailDir);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const message = JSON.parse(await readFile(path.join(dir, name), "utf8")) as {
        to?: string;
        magicLinkUrl?: string;
      };
      if (message.to === email && message.magicLinkUrl) return message.magicLinkUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no magic link for ${email}`);
}
