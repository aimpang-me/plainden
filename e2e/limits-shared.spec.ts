import { closeSync, ftruncateSync, mkdtempSync, openSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { openTool, sampleFiles, seedAllToolsPlan, signIn } from "./tools-a/support";

test("three free invoices block the next receipt in the same month", async ({ page }) => {
  test.setTimeout(90_000);
  await openTool(page, "/invoice-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Invoice number").fill("100");
  await page.getByLabel("Description").fill("Consulting");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Unit price").fill("10");
  for (let count = 1; count <= 3; count += 1) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    expect((await pending).suggestedFilename()).toBe("Invoice 100.pdf");
  }
  await openTool(page, "/receipt-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Receipt number").fill("R-9");
  await page.getByLabel("Description").fill("Rent");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Unit price").fill("10");
  await page.getByLabel("Payment method").selectOption("card");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect(page.getByRole("status")).toHaveText("The free plan includes 3 receipts a month.");
});

test("a paid plan accepts a PDF over 25 MB and refuses one over 200 MB", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  const entitlement = page.waitForResponse((response) => response.url().includes("/api/entitlement?key=pdf") && response.ok());
  await openTool(page, "/compress-pdf");
  expect(await (await entitlement).json()).toEqual({ entitlementKey: "pdf", plan: "paid" });
  const files = await sampleFiles();
  await page.getByLabel("PDF file", { exact: true }).setInputFiles(files.huge);
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByRole("status")).toHaveText("huge.pdf is not a PDF.");

  const dir = mkdtempSync(path.join(tmpdir(), "plainden-pdf-cap-"));
  const over = path.join(dir, "over.pdf");
  const handle = openSync(over, "w");
  try {
    ftruncateSync(handle, 200 * 1024 * 1024 + 1);
  } finally {
    closeSync(handle);
  }
  try {
    await page.getByLabel("PDF file", { exact: true }).setInputFiles(over);
    await page.getByRole("button", { name: "Compress PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("The paid plan allows files up to 200 MB.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
