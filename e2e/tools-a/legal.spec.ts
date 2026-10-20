import { expect, test, type Page } from "@playwright/test";
import { openTool, plannedOrMissing, seedAllToolsPlan, signIn, withViewports } from "./support";

test.describe.configure({ timeout: 90_000 });

const fixmeReason = "Batch B has not replaced this planned placeholder.";

const answers = {
  business: "Northwind Studio",
  site: "https://northwind.example",
  email: "ada@example.com",
  jurisdiction: "EU/UK",
  detail: "We sell workshop tickets online.",
};

withViewports(() => {
  test("a privacy questionnaire copies text and HTML that contain every answer", async ({ page }) => {
    await stopUntilBuilt(page, "/privacy-policy-generator");
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
    await stopUntilBuilt(page, "/terms-and-conditions-generator");
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
      await stopUntilBuilt(page, slug);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fillQuestionnaire(page);
      const text = await copied(page, "Copy text");
      expect(text).toContain(answers.business);
      expect(text.toLowerCase()).toContain("not legal advice");
    }
  });

  test("cookie and refund drafts contain every answer", async ({ page }) => {
    await stopUntilBuilt(page, "/cookie-policy-generator");
    await fillQuestionnaire(page);
    const cookie = await copied(page, "Copy text");
    expect(cookie.toLowerCase()).toContain("cookie");
    expect(cookie).toContain(answers.business);
    expect(cookie).toContain(answers.detail);
    expect(cookie.toLowerCase()).toContain("not legal advice");

    await stopUntilBuilt(page, "/refund-policy-generator");
    await fillQuestionnaire(page);
    const refund = await copied(page, "Copy text");
    expect(refund.toLowerCase()).toContain("refund");
    expect(refund).toContain(answers.business);
    expect(refund).toContain(answers.detail);
    expect(refund.toLowerCase()).toContain("not legal advice");
  });
});

test("a free visitor who asks for a hosted policy sees the pricing prompt", async ({ page }) => {
  await stopUntilBuilt(page, "/privacy-policy-generator");
  await fillQuestionnaire(page);
  await page.getByRole("button", { name: "Publish hosted link" }).click();
  await expect(page.getByRole("status")).toContainText("free");
  await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
});

test("a paid hosted policy link shows the answers", async ({ page }) => {
  await stopUntilBuilt(page, "/privacy-policy-generator");
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  await openTool(page, "/privacy-policy-generator");
  await fillQuestionnaire(page);
  await page.getByRole("button", { name: "Download PDF" }).click();
  await page.getByRole("button", { name: "Download Markdown" }).click();
  await page.getByRole("button", { name: "Publish hosted link" }).click();
  const hosted = page.getByRole("link", { name: /\/p\// });
  await expect(hosted).toBeVisible();
  const href = await hosted.getAttribute("href");
  expect(href).toMatch(/\/p\//);
  await page.goto(href ?? "/");
  await expect(page.getByText(answers.business)).toBeVisible();
  await expect(page.getByText(answers.detail)).toBeVisible();
  await expect(page.getByText(/not legal advice/i)).toBeVisible();
});

async function stopUntilBuilt(page: Page, slug: string): Promise<void> {
  await openTool(page, slug);
  if (await plannedOrMissing(page)) test.fixme(true, fixmeReason);
}

async function fillQuestionnaire(page: Page): Promise<void> {
  await page.getByLabel("Business name").fill(answers.business);
  await page.getByLabel("Website").fill(answers.site);
  await page.getByLabel("Contact email").fill(answers.email);
  await page.getByLabel("Jurisdiction").selectOption(answers.jurisdiction);
  await page.getByLabel("What the business does").fill(answers.detail);
}

async function copied(page: Page, button: string): Promise<string> {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: button }).click();
  return page.evaluate(() => navigator.clipboard.readText());
}
