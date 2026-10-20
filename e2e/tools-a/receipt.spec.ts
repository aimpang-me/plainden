import { expect, test } from "@playwright/test";
import { expectPdf, openTool, pageCount, pdfText, readDownload, seedAllToolsPlan, signIn, withViewports } from "./support";

test.describe.configure({ timeout: 90_000 });

const longTails = [
  { slug: "/rent-receipt-generator", title: "Rent receipt generator", number: "RENT-20", total: "$1,200.00", method: "transfer" },
  { slug: "/cash-receipt-template", title: "Cash receipt template", number: "CASH-20", total: "$18.00", method: "cash" },
  { slug: "/payment-receipt-generator", title: "Payment receipt generator", number: "PAY-20", total: "$210.00", method: "card" },
  { slug: "/receipt-template-word", title: "Receipt template instead of Word", number: "RW-20", total: "$250.00", method: "check" },
  { slug: "/donation-receipt-template", title: "Donation receipt template", number: "DON-20", total: "$50.00", method: "other" },
] as const;

withViewports(() => {
  test("a receipt downloads a one-page PDF with the paid stamp", async ({ page }) => {
    await openTool(page, "/receipt-generator");
    await expect(page.getByRole("heading", { level: 1, name: "Receipt generator" })).toBeVisible();
    await page.getByLabel("Your name").fill("Ada");
    await page.getByLabel("Client name").fill("Bea");
    await page.getByLabel("Receipt number").fill("R-9");
    await page.getByLabel("Description").fill("Rent");
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Unit price").fill("10");
    await page.getByLabel("Payment method").selectOption("card");
    const preview = page.getByRole("heading", { name: "Preview" }).locator("xpath=..");
    await expect(preview).toContainText("Total $10.00");
    await expect(preview).toContainText("PAID");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("Receipt R-9.pdf");
    await expect(page.getByRole("status")).toHaveText("Downloaded Receipt R-9.pdf");
    const bytes = await readDownload(download);
    expectPdf(bytes);
    expect(await pageCount(bytes)).toBe(1);
    const text = pdfText(bytes);
    expect(text).toContain("PAID");
    expect(text).toContain("R-9");
    expect(text).toContain("Rent");
    expect(text).toContain("$10.00");
    expect(text).toContain("made with plainden");
  });

  test("each receipt long-tail page opens its preset and paid stamp", async ({ page }) => {
    for (const tail of longTails) {
      await openTool(page, tail.slug);
      await expect(page.getByRole("heading", { level: 1, name: tail.title })).toBeVisible();
      await expect(page.getByLabel("Receipt number")).toHaveValue(tail.number);
      await expect(page.getByLabel("Payment method")).toHaveValue(tail.method);
      const preview = page.getByRole("heading", { name: "Preview" }).locator("xpath=..");
      await expect(preview).toContainText(`Total ${tail.total}`);
      await expect(preview).toContainText("PAID");
    }
  });
});

test("a paid receipt PDF omits the free footer", async ({ page }) => {
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  await openTool(page, "/receipt-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Receipt number").fill("R-10");
  await page.getByLabel("Description").fill("Rent");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Unit price").fill("10");
  await page.getByLabel("Payment method").selectOption("card");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const text = pdfText(await readDownload(await pending));
  expect(text).toContain("PAID");
  expect(text).toContain("$10.00");
  expect(text).not.toContain("made with plainden");
});
