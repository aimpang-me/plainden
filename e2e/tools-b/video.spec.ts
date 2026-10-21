import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { longTailSlugs, probeVideo } from "./media";
import { downloadFile, expectFits, fixtures, openTool, viewports } from "./support";

const unbuilt = "video compressor is not built on this branch";
const clip = path.join(fixtures, "clip.mp4");

test.describe.configure({ timeout: 180_000 });

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("compresses clip.mp4 under the Discord 8 MB cap", async ({ page }) => {
      await openTool(page, "/compress-video", unbuilt);
      const button = page.getByRole("button", { name: "Compress video" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("Video file").setInputFiles(clip);
      await page.getByLabel("Preset").selectOption({ label: "Discord 8 MB" });
      await button.click();
      const file = await downloadFile(page, 120_000);
      const probed = probeVideo(file.bytes);
      expect(file.bytes.length).toBeLessThanOrEqual(8 * 1024 * 1024);
      expect(probed).toEqual({ codec: "h264", width: 1280, height: 720 });
    });

    test("compresses clip.mp4 to 480p", async ({ page }) => {
      await openTool(page, "/compress-video", unbuilt);
      await page.getByLabel("Video file").setInputFiles(clip);
      await page.getByLabel("Preset").selectOption({ label: "480p" });
      await page.getByRole("button", { name: "Compress video" }).click();
      const file = await downloadFile(page, 120_000);
      expect(probeVideo(file.bytes)).toEqual({ codec: "h264", width: 854, height: 480 });
    });

    test("compresses clip.mp4 to 720p", async ({ page }) => {
      await openTool(page, "/compress-video", unbuilt);
      await page.getByLabel("Video file").setInputFiles(clip);
      await page.getByLabel("Preset").selectOption({ label: "720p" });
      await page.getByRole("button", { name: "Compress video" }).click();
      const file = await downloadFile(page, 120_000);
      expect(probeVideo(file.bytes)).toEqual({ codec: "h264", width: 1280, height: 720 });
    });

    test("compresses clip.mp4 for WhatsApp", async ({ page }) => {
      await openTool(page, "/compress-video", unbuilt);
      await page.getByLabel("Video file").setInputFiles(clip);
      await page.getByLabel("Preset").selectOption({ label: "WhatsApp 16 MB" });
      await page.getByRole("button", { name: "Compress video" }).click();
      const file = await downloadFile(page, 120_000);
      expect(file.bytes.length).toBeLessThanOrEqual(16 * 1024 * 1024);
      expect(probeVideo(file.bytes)).toEqual({ codec: "h264", width: 1280, height: 720 });
    });

    test("blocks a file over 100 MB and links to pricing", async ({ page }) => {
      await openTool(page, "/compress-video", unbuilt);
      const limit = 100 * 1024 * 1024;
      const dir = mkdtempSync(path.join(tmpdir(), "plainden-big-"));
      const big = path.join(dir, "big.mp4");
      writeFileSync(big, Buffer.alloc(limit + 1));
      try {
        await page.getByLabel("Video file").setInputFiles(big);
        await page.getByRole("button", { name: "Compress video" }).click();
        await expect(page.getByRole("status")).toHaveText("The free plan allows files up to 100 MB.");
        await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    test("compress-video-for-discord stays under 8 MB", async ({ page }) => {
      await openTool(page, "/compress-video-for-discord", unbuilt);
      await page.getByLabel("Video file").setInputFiles(clip);
      const preset = page.getByLabel("Preset");
      if ((await preset.count()) > 0) await preset.selectOption({ label: "Discord 8 MB" });
      await page.getByRole("button", { name: "Compress video" }).click();
      const file = await downloadFile(page, 120_000);
      const probed = probeVideo(file.bytes);
      expect(file.bytes.length).toBeLessThanOrEqual(8 * 1024 * 1024);
      expect(probed.codec).toBe("h264");
      expect(probed.height).toBe(720);
    });

    test("opens the other video long-tail pages and returns a video", async ({ page }) => {
      const slugs = longTailSlugs("video");
      if (slugs === null) throw new Error("video long-tail pages are not on this branch");
      expect(slugs.length).toBeGreaterThanOrEqual(5);
      const extra = slugs.filter((slug) => slug !== "compress-video-for-discord");
      expect(extra.length).toBeGreaterThan(0);
      for (const slug of extra) {
        await openTool(page, `/${slug}`, `video long-tail /${slug} is not on this branch`);
        await page.locator("main input[type=file]").setInputFiles(clip);
        const button = page.locator("main form button").last();
        if (viewport.width === 375) await expectFits(button, viewport.width);
        await button.click();
        const file = await downloadFile(page, 120_000);
        const probed = probeVideo(file.bytes);
        expect(probed.codec).toBe("h264");
        if (slug.includes("480")) {
          expect(probed).toEqual({ codec: "h264", width: 854, height: 480 });
        } else if (slug.includes("720")) {
          expect(probed).toEqual({ codec: "h264", width: 1280, height: 720 });
        } else if (slug.includes("whatsapp")) {
          expect(file.bytes.length).toBeLessThanOrEqual(16 * 1024 * 1024);
          expect(probed).toEqual({ codec: "h264", width: 1280, height: 720 });
        } else {
          expect(file.bytes.length).toBeLessThanOrEqual(8 * 1024 * 1024);
          expect(probed).toEqual({ codec: "h264", width: 1280, height: 720 });
        }
      }
    });
  });
}
