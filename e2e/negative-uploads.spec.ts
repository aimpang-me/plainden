import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openTool as openPdf } from "./tools-a/support";
import { openTool as openBuilt } from "./tools-b/support";

test("the wrong file type is refused on each converter", async ({ page }) => {
  test.setTimeout(90_000);
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-wrong-"));
  const notes = path.join(dir, "notes.txt");
  await writeFile(notes, "hello");
  try {
    await openBuilt(page, "/compress-image", "image tools are not built on this branch");
    await page.getByLabel("Images").setInputFiles(notes);
    await page.getByRole("button", { name: "Compress images" }).click();
    await expect(page.getByRole("status")).toHaveText("notes.txt is not a JPEG, PNG, or WebP.");

    await openPdf(page, "/compress-pdf");
    await rejectPdf(page, "PDF file", notes, "notes.txt is not a PDF.");

    await openPdf(page, "/jpg-to-pdf");
    await page.getByLabel("JPG files", { exact: true }).setInputFiles(notes);
    await page.getByRole("button", { name: "Make PDF" }).click();
    await expect(page.getByRole("status")).toHaveText("notes.txt is not a JPG.");

    await openBuilt(page, "/csv-to-json", "data converters are not built on this branch");
    await page.getByLabel("CSV file").setInputFiles(notes);
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByRole("status")).toHaveText("This file type does not match this page.");

    await openBuilt(page, "/srt-to-vtt", "subtitle converter is not built on this branch");
    await page.getByLabel("Subtitle files").setInputFiles(notes);
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByRole("status")).toHaveText("notes.txt. This file is not SRT, VTT, or ASS.");

    await openBuilt(page, "/compress-video", "video compressor is not built on this branch");
    await page.getByLabel("Video file").setInputFiles(notes);
    await page.getByRole("button", { name: "Compress video" }).click();
    await expect(page.getByRole("status")).toHaveText("Could not read the video length.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function rejectPdf(page: Page, label: string, file: string, message: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await expect(page.getByRole("status")).toHaveText(message);
}
