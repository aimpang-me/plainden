import { expect, test } from "@playwright/test";
import {
  expectPdf,
  expectPreviewTotal,
  openTool,
  pageCount,
  pdfText,
  readDownload,
  seedAllToolsPlan,
  signIn,
  withViewports,
} from "./support";

test.describe.configure({ timeout: 90_000 });

const longTails = [
  {
    slug: "/invoice-generator-canada",
    title: "Invoice generator for Canada",
    from: "Northwind Studio",
    client: "Harbour Co",
    number: "CA-1001",
    total: "CA$210.00",
  },
  {
    slug: "/invoice-template-google-docs",
    title: "Invoice template instead of a Google Doc",
    from: "Plain Desk",
    client: "Maple Blog",
    number: "GD-20",
    total: "$120.00",
  },
  {
    slug: "/invoice-template-word",
    title: "Invoice template instead of Word",
    from: "Plain Desk",
    client: "River School",
    number: "WD-20",
    total: "$250.00",
  },
  {
    slug: "/invoice-template-excel",
    title: "Invoice template instead of Excel",
    from: "Plain Desk",
    client: "Cedar Books",
    number: "XL-20",
    total: "$100.00",
  },
  {
    slug: "/freelance-invoice-template",
    title: "Freelance invoice template",
    from: "Ada Lane",
    client: "North Studio",
    number: "FR-20",
    total: "$600.00",
  },
] as const;

withViewports(() => {
  test("a filled invoice downloads a one-page PDF with the total and the free footer", async ({ page }) => {
    await openTool(page, "/invoice-generator");
    await expect(page.getByRole("heading", { level: 1, name: "Invoice generator" })).toBeVisible();
    await page.getByLabel("Your name").fill("Ada");
    await page.getByLabel("Client name").fill("Bea");
    await page.getByLabel("Invoice number").fill("100");
    await page.getByLabel("Description").fill("Consulting");
    await page.getByLabel("Quantity").fill("2");
    await page.getByLabel("Unit price").fill("10");
    await expectPreviewTotal(page, "$20.00");
    await expect(page.getByText("Saving invoices is part of the paid plan.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preview" }).locator("xpath=..")).toContainText("made with plainden");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("Invoice 100.pdf");
    await expect(page.getByRole("status")).toHaveText("Downloaded Invoice 100.pdf");
    const bytes = await readDownload(download);
    expectPdf(bytes);
    expect(await pageCount(bytes)).toBe(1);
    const text = pdfText(bytes);
    expect(text).toContain("Ada");
    expect(text).toContain("Bea");
    expect(text).toContain("Consulting");
    expect(text).toContain("$20.00");
    expect(text).toContain("made with plainden");
  });

  test("the fourth free PDF shows the monthly pricing prompt", async ({ page }) => {
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
      const download = await pending;
      expect(download.suggestedFilename()).toBe("Invoice 100.pdf");
      expectPdf(await readDownload(download));
    }
    await page.getByRole("button", { name: "Download PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("The free plan includes 3 invoices a month.");
    await expect(page.getByRole("link", { name: "See pricing" })).toHaveCount(2);
  });

  test("each invoice long-tail page opens its preset", async ({ page }) => {
    for (const tail of longTails) {
      await openTool(page, tail.slug);
      await expect(page.getByRole("heading", { level: 1, name: tail.title })).toBeVisible();
      await expect(page.getByLabel("Your name")).toHaveValue(tail.from);
      await expect(page.getByLabel("Client name")).toHaveValue(tail.client);
      await expect(page.getByLabel("Invoice number")).toHaveValue(tail.number);
      if (tail.slug === "/invoice-generator-canada") {
        await expect(page.getByLabel("Your address")).toHaveValue("12 King St, Toronto");
        await expect(page.getByLabel("Notes")).toHaveValue(
          "Tax is the percent on the subtotal. Split GST and PST in the notes if you need both.",
        );
      }
      await expectPreviewTotal(page, tail.total);
    }
  });
});

test("a paid account saves an invoice and the PDF omits the free footer", async ({ page }) => {
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  await openTool(page, "/invoice-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Invoice number").fill("200");
  await page.getByLabel("Description").fill("Consulting");
  await page.getByLabel("Quantity").fill("2");
  await page.getByLabel("Unit price").fill("10");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview" }).locator("xpath=..")).not.toContainText("made with plainden");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const bytes = await readDownload(await pending);
  expectPdf(bytes);
  expect(pdfText(bytes)).not.toContain("made with plainden");
  expect(pdfText(bytes)).toContain("$20.00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/^Saved [0-9a-f-]{36}$/);
  const listed = await page.request.get("/api/invoices?kind=invoice");
  expect(listed.ok()).toBeTruthy();
  const body = (await listed.json()) as { documents?: { to?: { name?: string } }[] };
  expect(body.documents?.map((document) => document.to?.name)).toContain("Bea");
});

test("loading a saved invoice puts the client name back in the form", async ({ page }) => {
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  await openTool(page, "/invoice-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Invoice number").fill("201");
  await page.getByLabel("Description").fill("Consulting");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Unit price").fill("10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/^Saved [0-9a-f-]{36}$/);
  await page.getByLabel("Client name").fill("Changed");
  await page.getByRole("button", { name: "Load saved" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved documents loaded.");
  await expect(page.getByLabel("Client name")).toHaveValue("Bea");
});
