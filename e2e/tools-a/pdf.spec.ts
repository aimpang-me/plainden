import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectPdf, openTool, pageCount, readDownload, sampleFiles, seedAllToolsPlan, signIn, withViewports } from "./support";

test.describe.configure({ timeout: 120_000 });

const pages = [
  ["/merge-pdf", "Merge PDF"],
  ["/split-pdf", "Split PDF"],
  ["/compress-pdf", "Compress PDF"],
  ["/jpg-to-pdf", "JPG to PDF"],
  ["/merge-pdf-files", "Merge PDF files"],
  ["/split-pdf-pages", "Split PDF pages"],
  ["/jpg-to-pdf-photos", "Turn JPG photos into a PDF"],
  ["/compress-pdf-scans", "Compress JPEG scans in a PDF"],
] as const;

withViewports(() => {
  test("merge, split, jpg, and compress produce PDFs with the expected pages", async ({ page }) => {
    const files = await sampleFiles();
    for (const [slug, title] of pages) {
      await openTool(page, slug);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    }

    await openTool(page, "/compress-pdf-to-4mb");
    await expect(page.getByRole("heading", { level: 1, name: "Compress a PDF toward 4 MB" })).toBeVisible();
    await expect(page.getByText("The goal is up to 4 MB, and the page does not promise a 4 MB file.")).toBeVisible();
    await expect(page.getByText("Photo compression aims for up to 4 MB. It does not promise a 4 MB file.")).toBeVisible();

    await openTool(page, "/merge-pdf");
    await page.getByLabel("PDF files", { exact: true }).setInputFiles([files.one, files.two]);
    await page.getByRole("button", { name: "Merge PDFs" }).click();
    await expect(page.getByRole("status")).toHaveText("Merged 2 files into 3 pages.");
    const merged = await readDownload(await clickNamed(page, "merged.pdf"));
    expectPdf(merged);
    expect(await pageCount(merged)).toBe(3);
    expect(merged.length).toBeGreaterThan(500);

    await openTool(page, "/split-pdf");
    await page.getByLabel("PDF file", { exact: true }).setInputFiles(files.two);
    await page.getByRole("button", { name: "Split PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("Split into 2 PDFs.");
    const first = await readDownload(await clickNamed(page, "page-1.pdf"));
    const second = await readDownload(await clickNamed(page, "page-2.pdf"));
    expectPdf(first);
    expectPdf(second);
    expect(await pageCount(first)).toBe(1);
    expect(await pageCount(second)).toBe(1);

    await openTool(page, "/jpg-to-pdf");
    await page.getByLabel("JPG files", { exact: true }).setInputFiles(files.jpg);
    await page.getByRole("button", { name: "Make PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("Made a PDF with 1 page.");
    const images = await readDownload(await clickNamed(page, "images.pdf"));
    expectPdf(images);
    expect(await pageCount(images)).toBe(1);

    await openTool(page, "/compress-pdf");
    await page.getByLabel("PDF file", { exact: true }).setInputFiles(await saveBytes(images, "images.pdf"));
    await page.getByRole("button", { name: "Compress PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("Checked 1 JPEG image. Encoded 1. Recompressed 0.");
    const compressed = await readDownload(await clickNamed(page, "compressed.pdf"));
    expectPdf(compressed);
    expect(await pageCount(compressed)).toBe(1);
    expect(compressed.length).toBeGreaterThan(200);
  });

  test("a file over 25 MB and a sixth run show the free pricing prompt", async ({ page }) => {
    const files = await sampleFiles();
    await openTool(page, "/compress-pdf");
    await page.getByLabel("PDF file", { exact: true }).setInputFiles(files.huge);
    await page.getByRole("button", { name: "Compress PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("The free plan allows files up to 25 MB.");
    await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();

    await openTool(page, "/jpg-to-pdf");
    await page.getByLabel("JPG files", { exact: true }).setInputFiles(files.jpg);
    for (let count = 1; count <= 5; count += 1) {
      await page.getByRole("button", { name: "Make PDF" }).click();
      await expect(page.getByRole("status")).toHaveText("Made a PDF with 1 page.");
    }
    await page.getByRole("button", { name: "Make PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("The free plan allows 5 PDF runs a day.");
    await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
  });
});

test("a paid plan still makes a PDF after five free runs", async ({ page }) => {
  const files = await sampleFiles();
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  const entitlement = page.waitForResponse((response) => response.url().includes("/api/entitlement?key=pdf"));
  await openTool(page, "/jpg-to-pdf");
  expect(await (await entitlement).json()).toEqual({ entitlementKey: "pdf", plan: "paid" });
  await page.getByLabel("JPG files", { exact: true }).setInputFiles(files.jpg);
  for (let count = 1; count <= 6; count += 1) {
    await page.getByRole("button", { name: "Make PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("Made a PDF with 1 page.");
  }
  await expect(page.getByRole("link", { name: "See pricing" })).toHaveCount(0);
});

async function clickNamed(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name, exact: true }).click();
  return pending;
}

async function saveBytes(bytes: Buffer, name: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-out-"));
  const file = path.join(dir, name);
  await writeFile(file, bytes);
  return file;
}
