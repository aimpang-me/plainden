import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { imageInfo, longTailSlugs } from "./media";
import { downloadFile, expectFits, fixtures, openTool, viewports } from "./support";

const unbuilt = "image tools are not built on this branch";
const photo = path.join(fixtures, "photo.jpg");
const frame = path.join(fixtures, "frame.png");
const heic = path.join(fixtures, "frame.heic");
const webp = path.join(fixtures, "frame.webp");
const seeds = new Set(["compress-image-to-100kb", "compress-image-to-200kb", "resize-image-to-20kb"]);

test.describe.configure({ timeout: 180_000 });

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("compresses photo.jpg to 100 KB", async ({ page }) => {
      await openTool(page, "/compress-image", unbuilt);
      const button = page.getByRole("button", { name: "Compress images" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("Images").setInputFiles(photo);
      await page.getByLabel("Target").selectOption({ label: "100 KB" });
      await button.click();
      const file = await downloadFile(page);
      await expectTargetOrAdmittedMiss(page, file.bytes.length, 100 * 1024);
      expect(imageInfo(file.bytes).format).toBe("jpeg");
    });

    test("compresses photo.jpg to 200 KB", async ({ page }) => {
      await openTool(page, "/compress-image", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      await page.getByLabel("Target").selectOption({ label: "200 KB" });
      await page.getByRole("button", { name: "Compress images" }).click();
      const file = await downloadFile(page);
      await expectTargetOrAdmittedMiss(page, file.bytes.length, 200 * 1024);
      expect(imageInfo(file.bytes).format).toBe("jpeg");
    });

    test("resizes frame.png to fit inside 200 by 100", async ({ page }) => {
      await openTool(page, "/resize-image", unbuilt);
      const button = page.getByRole("button", { name: "Resize images" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("Images").setInputFiles(frame);
      await page.getByLabel("Width").fill("200");
      await page.getByLabel("Height").fill("100");
      await button.click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "png", width: 133, height: 100 });
    });

    test("resizes frame.png to 50 percent", async ({ page }) => {
      await openTool(page, "/resize-image", unbuilt);
      await page.getByLabel("Images").setInputFiles(frame);
      await page.getByLabel("Resize by").selectOption({ label: "Percent" });
      await page.getByRole("spinbutton", { name: "Percent" }).fill("50");
      await page.getByRole("button", { name: "Resize images" }).click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "png", width: 160, height: 120 });
    });

    test("converts photo.jpg to PNG", async ({ page }) => {
      await openTool(page, "/convert-image", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      await page.getByLabel("Format").selectOption({ label: "PNG" });
      await page.getByRole("button", { name: "Convert images" }).click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "png", width: 1600, height: 1200 });
    });

    test("converts photo.jpg to WebP", async ({ page }) => {
      await openTool(page, "/convert-image", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      await page.getByLabel("Format").selectOption({ label: "WebP" });
      await page.getByRole("button", { name: "Convert images" }).click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "webp", width: 1600, height: 1200 });
    });

    test("converts frame.heic to a 320 by 240 JPG", async ({ page }) => {
      await openTool(page, "/heic-to-jpg", unbuilt);
      await page.getByLabel("Images").setInputFiles(heic);
      await page.getByRole("button", { name: "Convert HEIC to JPG" }).click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "jpeg", width: 320, height: 240 });
    });

    test("converts frame.webp to a 320 by 240 PNG", async ({ page }) => {
      await openTool(page, "/webp-to-png", unbuilt);
      await page.getByLabel("Images").setInputFiles(webp);
      await page.getByRole("button", { name: "Convert WebP to PNG" }).click();
      const file = await downloadFile(page);
      expect(imageInfo(file.bytes)).toEqual({ format: "png", width: 320, height: 240 });
    });

    test("blocks a file over 10 MB and links to pricing", async ({ page }) => {
      await openTool(page, "/compress-image", unbuilt);
      const limit = 10 * 1024 * 1024;
      await page.getByLabel("Images").setInputFiles({
        name: "big.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.alloc(limit + 1),
      });
      await page.getByRole("button", { name: "Compress images" }).click();
      await expect(page.getByRole("status")).toHaveText(`free fileSize allows ${limit}`);
      await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    });

    test("blocks an 11 image batch and links to pricing", async ({ page }) => {
      await openTool(page, "/compress-image", unbuilt);
      const png = readFileSync(frame);
      await page.getByLabel("Images").setInputFiles(
        Array.from({ length: 11 }, (_, index) => ({
          name: `frame-${index}.png`,
          mimeType: "image/png",
          buffer: png,
        })),
      );
      await page.getByRole("button", { name: "Compress images" }).click();
      await expect(page.getByRole("status")).toHaveText("free batchCount allows 10");
      await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    });

    test("compress-image-to-100kb lands within 10 percent", async ({ page }) => {
      await openTool(page, "/compress-image-to-100kb", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      const target = page.getByLabel("Target");
      if ((await target.count()) > 0) await target.selectOption({ label: "100 KB" });
      await page.getByRole("button", { name: "Compress images" }).click();
      const file = await downloadFile(page);
      await expectTargetOrAdmittedMiss(page, file.bytes.length, 100 * 1024);
    });

    test("compress-image-to-200kb lands within 10 percent", async ({ page }) => {
      await openTool(page, "/compress-image-to-200kb", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      const target = page.getByLabel("Target");
      if ((await target.count()) > 0) await target.selectOption({ label: "200 KB" });
      await page.getByRole("button", { name: "Compress images" }).click();
      const file = await downloadFile(page);
      await expectTargetOrAdmittedMiss(page, file.bytes.length, 200 * 1024);
    });

    test("resize-image-to-20kb lands within 10 percent of 20 KB", async ({ page }) => {
      await openTool(page, "/resize-image-to-20kb", unbuilt);
      await page.getByLabel("Images").setInputFiles(photo);
      await page.getByRole("button", { name: "Compress images" }).click();
      const file = await downloadFile(page);
      await expectTargetOrAdmittedMiss(page, file.bytes.length, 20 * 1024);
    });

    test("opens the other image long-tail pages and returns an image", async ({ page }) => {
      const slugs = longTailSlugs("image");
      if (slugs === null) {
        test.fixme(true, "image long-tail pages are not on this branch");
        return;
      }
      expect(slugs.length).toBeGreaterThanOrEqual(5);
      const extra = slugs.filter((slug) => !seeds.has(slug));
      expect(extra.length).toBeGreaterThan(0);
      for (const slug of extra) {
        await openTool(page, `/${slug}`, `image long-tail /${slug} is not on this branch`);
        await page.locator("main input[type=file]").setInputFiles(photo);
        const button = page.locator("main form button").last();
        if (viewport.width === 375) await expectFits(button, viewport.width);
        await button.click();
        const file = await downloadFile(page, 60_000);
        const info = imageInfo(file.bytes);
        expect(["png", "jpeg", "webp"]).toContain(info.format);
        expect(info.width).toBeGreaterThan(0);
        expect(info.height).toBeGreaterThan(0);
      }
    });
  });
}

async function expectTargetOrAdmittedMiss(page: Page, actual: number, target: number) {
  const near = Math.abs(actual - target) <= target * 0.1;
  if (near) return;
  await expect(page.getByRole("status")).toContainText("outside 10%");
}
