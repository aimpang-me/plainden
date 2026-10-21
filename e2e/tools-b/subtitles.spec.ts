import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { longTailSlugs, parseCues } from "./media";
import { downloadFile, expectFits, fixtures, openTool, viewports } from "./support";

const unbuilt = "subtitle converter is not built on this branch";
const srt = path.join(fixtures, "sample.srt");
const vtt = path.join(fixtures, "sample.vtt");
const ass = path.join(fixtures, "sample.ass");
const original = [
  { startMs: 1000, endMs: 2500, text: "Hello" },
  { startMs: 3000, endMs: 4000, text: "World" },
];
const shifted = [
  { startMs: 2000, endMs: 3500, text: "Hello" },
  { startMs: 4000, endMs: 5000, text: "World" },
];

test.describe.configure({ timeout: 60_000 });

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("shifts sample.srt by 1000 ms into VTT and round trips to SRT", async ({ page }) => {
      await openTool(page, "/srt-to-vtt", unbuilt);
      const button = page.getByRole("button", { name: "Convert" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("Subtitle files").setInputFiles(srt);
      await page.getByLabel("Timing shift (ms)").fill("1000");
      await button.click();
      const vtt = await downloadFile(page);
      const vttText = vtt.bytes.toString("utf8");
      expect(vttText.startsWith("WEBVTT")).toBe(true);
      expect(parseCues(vttText)).toEqual(shifted);

      await openTool(page, "/srt-converter", unbuilt);
      await page.getByLabel("Subtitle files").setInputFiles({
        name: "shifted.vtt",
        mimeType: "text/vtt",
        buffer: vtt.bytes,
      });
      await page.getByLabel("Output").selectOption({ label: "SRT" });
      await page.getByLabel("Timing shift (ms)").fill("0");
      await page.getByRole("button", { name: "Convert" }).click();
      const back = await downloadFile(page);
      const srtText = back.bytes.toString("utf8");
      expect(srtText).toContain("00:00:02,000");
      expect(srtText).toContain("00:00:03,500");
      expect(parseCues(srtText)).toEqual(shifted);
    });

    test("blocks a second subtitle file and links to pricing", async ({ page }) => {
      await openTool(page, "/srt-to-vtt", unbuilt);
      const bytes = readFileSync(srt);
      await page.getByLabel("Subtitle files").setInputFiles([
        { name: "one.srt", mimeType: "application/x-subrip", buffer: bytes },
        { name: "two.srt", mimeType: "application/x-subrip", buffer: bytes },
      ]);
      await page.getByRole("button", { name: "Convert" }).click();
      await expect(page.getByRole("status")).toHaveText("The free plan converts one subtitle file at a time.");
      await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    });

    test("opens each subtitle long-tail page and returns the cues", async ({ page }) => {
      const slugs = longTailSlugs("subtitles");
      if (slugs === null) throw new Error("subtitle long-tail pages are not on this branch");
      expect(slugs.length).toBeGreaterThanOrEqual(5);
      for (const slug of slugs) {
        await openTool(page, `/${slug}`, `subtitle long-tail /${slug} is not on this branch`);
        const input = slug.startsWith("ass-") ? ass : slug.startsWith("vtt-") ? vtt : srt;
        await page.locator("main input[type=file]").setInputFiles(input);
        const shift = page.getByLabel("Timing shift (ms)");
        if (slug !== "shift-subtitle-timing") await shift.fill("0");
        const button = page.locator("main form button").last();
        if (viewport.width === 375) await expectFits(button, viewport.width);
        await button.click();
        const file = await downloadFile(page);
        expect(parseCues(file.bytes.toString("utf8"))).toEqual(slug === "shift-subtitle-timing" ? shifted : original);
      }
    });
  });
}
