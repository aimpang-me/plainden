import path from "node:path";
import { expect, test } from "@playwright/test";
import { longTailSlugs, parseCsv } from "./media";
import { downloadFile, expectFits, fixtures, openTool, viewports } from "./support";

const unbuilt = "data converters are not built on this branch";
const csv = path.join(fixtures, "sample.csv");
const json = path.join(fixtures, "sample.json");
const excel = path.join(fixtures, "sample.xlsx");
const rows = [
  ["name", "qty"],
  ["Ada", "2"],
  ["Grace", "3"],
];
const records = [
  { name: "Ada", qty: "2" },
  { name: "Grace", qty: "3" },
];

test.describe.configure({ timeout: 60_000 });

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("round trips sample.csv through JSON and back to the same rows", async ({ page }) => {
      await openTool(page, "/csv-to-json", unbuilt);
      const button = page.getByRole("button", { name: "Convert" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("CSV file").setInputFiles(csv);
      await button.click();
      await expect(page.getByRole("cell", { name: "Ada", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Grace", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "2", exact: true })).toBeVisible();
      const jsonFile = await downloadFile(page);
      expect(JSON.parse(jsonFile.bytes.toString("utf8"))).toEqual(records);

      await openTool(page, "/json-to-csv", unbuilt);
      await page.getByLabel("JSON file").setInputFiles({
        name: "round.json",
        mimeType: "application/json",
        buffer: jsonFile.bytes,
      });
      await page.getByRole("button", { name: "Convert" }).click();
      const csvFile = await downloadFile(page);
      expect(parseCsv(csvFile.bytes.toString("utf8"))).toEqual(rows);
    });

    test("converts sample.json to the same CSV rows", async ({ page }) => {
      await openTool(page, "/json-to-csv", unbuilt);
      await page.getByLabel("JSON file").setInputFiles(json);
      await page.getByRole("button", { name: "Convert" }).click();
      const file = await downloadFile(page);
      expect(parseCsv(file.bytes.toString("utf8"))).toEqual(rows);
    });

    test("converts sample.xlsx to the same CSV rows", async ({ page }) => {
      await openTool(page, "/excel-to-csv", unbuilt);
      const button = page.getByRole("button", { name: "Convert" });
      if (viewport.width === 375) await expectFits(button, viewport.width);
      await page.getByLabel("Excel file").setInputFiles(excel);
      await button.click();
      await expect(page.getByRole("cell", { name: "Ada", exact: true })).toBeVisible();
      const file = await downloadFile(page);
      expect(parseCsv(file.bytes.toString("utf8"))).toEqual(rows);
    });

    test("blocks a file over 5 MB and links to pricing", async ({ page }) => {
      await openTool(page, "/csv-to-json", unbuilt);
      const limit = 5 * 1024 * 1024;
      await page.getByLabel("CSV file").setInputFiles({
        name: "big.csv",
        mimeType: "text/csv",
        buffer: Buffer.concat([Buffer.from("name,qty\n"), Buffer.alloc(limit + 1, 97)]),
      });
      await page.getByRole("button", { name: "Convert" }).click();
      await expect(page.getByRole("status")).toHaveText(`free fileSize allows ${limit}`);
      await expect(page.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
    });

    test("opens each data long-tail page and returns a file", async ({ page }) => {
      const slugs = longTailSlugs("data");
      if (slugs === null) {
        test.fixme(true, "data long-tail pages are not on this branch");
        return;
      }
      expect(slugs.length).toBeGreaterThanOrEqual(5);
      for (const slug of slugs) {
        await openTool(page, `/${slug}`, `data long-tail /${slug} is not on this branch`);
        await page.locator("main input[type=file]").setInputFiles(sourceFor(slug));
        const button = page.locator("main form button").last();
        if (viewport.width === 375) await expectFits(button, viewport.width);
        await button.click();
        const text = (await downloadFile(page)).bytes.toString("utf8");
        if (slug.includes("to-json")) expect(JSON.parse(text)).toEqual(records);
        else expect(parseCsv(text)).toEqual(rows);
      }
    });
  });
}

function sourceFor(slug: string): string | { name: string; mimeType: string; buffer: Buffer } {
  if (slug.includes("excel")) return excel;
  if (slug.includes("rows")) {
    return {
      name: "rows.json",
      mimeType: "application/json",
      buffer: Buffer.from('[["name","qty"],["Ada","2"],["Grace","3"]]\n'),
    };
  }
  if (slug.startsWith("json")) return json;
  if (slug.includes("semicolon")) {
    return { name: "semi.csv", mimeType: "text/csv", buffer: Buffer.from("name;qty\nAda;2\nGrace;3\n") };
  }
  if (slug.includes("tab")) {
    return { name: "tab.csv", mimeType: "text/csv", buffer: Buffer.from("name\tqty\nAda\t2\nGrace\t3\n") };
  }
  return csv;
}
