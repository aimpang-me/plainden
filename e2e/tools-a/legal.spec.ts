import { expect, test, type Page } from "@playwright/test";
import { openTool, seedAllToolsPlan, signIn, withViewports } from "./support";

test.describe.configure({ timeout: 90_000 });

const answers = {
  business: "Northwind Studio",
  site: "https://northwind.example",
  email: "ada@example.com",
  jurisdiction: "EU/UK",
  detail: "We sell workshop tickets online.",
};

withViewports(() => {
  test("a privacy questionnaire copies text and HTML that contain every answer", async ({ page }) => {
    await openTool(page, "/privacy-policy-generator");
    await fillQuestionnaire(page);
    const text = await copied(page, "Copy text");
    expect(text).toContain(answers.business);
    expect(text).toContain(answers.site);
    expect(text).toContain(answers.email);
    expect(text).toContain(answers.jurisdiction);
    expect(text).toContain(answers.detail);
    expect(text.toLowerCase()).toContain("not legal advice");
    expect(text.toLowerCase()).toContain("plainden");
    expect(text.toLowerCase()).not.toContain("gdpr compliant");
    expect(text.toLowerCase()).not.toContain("ccpa compliant");
    const html = await copied(page, "Copy HTML");
    expect(html).toContain(answers.business);
    expect(html).toContain(answers.detail);
    expect(html.toLowerCase()).toContain("not legal advice");
  });

  test("the terms slug puts the same answers in a terms draft", async ({ page }) => {
    await openTool(page, "/terms-and-conditions-generator");
    await fillQuestionnaire(page);
    const text = await copied(page, "Copy text");
    expect(text).toContain("Terms");
    expect(text).toContain(answers.business);
    expect(text).toContain(answers.site);
    expect(text).toContain(answers.detail);
    expect(text.toLowerCase()).toContain("not legal advice");
  });

  test("privacy long-tail pages open a working draft", async ({ page }) => {
    for (const slug of [
      "/privacy-policy-generator-for-app",
      "/privacy-policy-generator-for-meta-ads",
      "/privacy-policy-generator-for-blogger",
    ]) {
      await openTool(page, slug);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fillQuestionnaire(page);
      const text = await copied(page, "Copy text");
      expect(text).toContain(answers.business);
      expect(text.toLowerCase()).toContain("not legal advice");
    }
  });

  test("cookie and refund drafts contain every answer", async ({ page }) => {
    await openTool(page, "/cookie-policy-generator");
    await fillQuestionnaire(page);
    const cookie = await copied(page, "Copy text");
    expect(cookie.toLowerCase()).toContain("cookie");
    expect(cookie).toContain(answers.business);
    expect(cookie).toContain(answers.detail);
    expect(cookie.toLowerCase()).toContain("not legal advice");

    await openTool(page, "/refund-policy-generator");
    await fillQuestionnaire(page);
    const refund = await copied(page, "Copy text");
    expect(refund.toLowerCase()).toContain("refund");
    expect(refund).toContain(answers.business);
    expect(refund).toContain(answers.detail);
    expect(refund.toLowerCase()).toContain("not legal advice");
  });
});

test("a signed-in free account that publishes sees the pricing prompt", async ({ page }) => {
  await openTool(page, "/privacy-policy-generator");
  await signIn(page, test.info());
  await openTool(page, "/privacy-policy-generator");
  await fillQuestionnaire(page);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status")).toHaveText("Hosting a policy is part of the paid plan.");
  await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
});

test("a paid hosted policy link shows the answers", async ({ page }) => {
  await openTool(page, "/privacy-policy-generator");
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  const entitlement = page.waitForResponse(
    (response) => response.url().includes("/api/entitlement") && response.ok(),
  );
  await openTool(page, "/privacy-policy-generator");
  await entitlement;
  await fillQuestionnaire(page);
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await pdf;
  const markdown = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Markdown" }).click();
  await markdown;
  await page.getByRole("button", { name: "Publish" }).click();
  const hosted = page.getByRole("link", { name: /\/p\// });
  await expect(hosted).toBeVisible();
  const href = await hosted.getAttribute("href");
  expect(href).toMatch(/\/p\//);
  await page.goto(href ?? "/");
  await expect(page.getByText(answers.business)).toBeVisible();
  await expect(page.getByText(answers.detail)).toBeVisible();
  await expect(page.getByText(/not legal advice/i)).toBeVisible();
});

async function fillQuestionnaire(page: Page): Promise<void> {
  await fillLabel(page, "Business name", answers.business);
  await fillLabel(page, "Contact email", answers.email);
  await fillLabel(page, "Website", answers.site);
  const jurisdiction = page.getByLabel("Jurisdiction");
  if ((await jurisdiction.count()) > 0) await jurisdiction.selectOption(answers.jurisdiction);
  await fillLabel(page, "Data collected", answers.detail);
  await fillLabel(page, "Purpose", answers.detail);
  await fillLabel(page, "Retention", "30 days");
  await fillLabel(page, "Product", answers.detail);
  await fillLabel(page, "Acceptable use", answers.detail);
  await fillLabel(page, "Termination", "either party stops");
  await fillLabel(page, "Cookie name", "cart_id");
  await fillLabel(page, "Duration", "1 day");
  await fillLabel(page, "Refund window", "14 days");
  await fillLabel(page, "Refund method", "bank transfer");
  await fillLabel(page, "Exceptions", answers.detail);
}

async function fillLabel(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(label);
  if ((await field.count()) === 0) return;
  await field.fill(value);
}

async function copied(page: Page, button: string): Promise<string> {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: button }).click();
  return page.evaluate(() => navigator.clipboard.readText());
}
