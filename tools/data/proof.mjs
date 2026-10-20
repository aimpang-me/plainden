import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const base = "http://127.0.0.1:3100";
const evidence = path.join(root, "tools/data/evidence");
const fixtures = path.join(root, "tools/data/fixtures");
const lines = [];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function open(page, urlPath) {
  await page.goto(`${base}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
}

async function statusText(page) {
  return page.getByRole("status").innerText();
}

async function expectStatus(page, text) {
  await page.getByRole("status").filter({ hasText: text }).waitFor({ timeout: 20_000 });
  const actual = await statusText(page);
  if (actual !== text) fail(`status was ${JSON.stringify(actual)} expected ${JSON.stringify(text)}`);
  return actual;
}

async function downloadText(page, name) {
  return page.evaluate(async (downloadName) => {
    const link = document.querySelector(`a[download="${downloadName}"]`);
    if (!link) return "";
    const response = await fetch(link.href);
    return response.text();
  }, name);
}

const landing = await fetch(base, { signal: AbortSignal.timeout(2000) }).catch(() => null);
if (!landing || landing.status !== 200) {
  fail("verification server is not on http://127.0.0.1:3100. Launch it with plainden-verify.mjs first.");
}

mkdirSync(evidence, { recursive: true });
const objectsJson = readFileSync(path.join(fixtures, "people.json"), "utf8");
const csvText = "name,city\nAda,Oslo\nBea,Lima";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await open(page, "/csv-to-json");
const heading = await page.getByRole("heading", { level: 1 }).innerText();
if (heading !== "CSV, JSON, and Excel converter") fail(`heading was ${JSON.stringify(heading)}`);
await page.locator("input[type=file]").setInputFiles(path.join(fixtures, "people.csv"));
await page.getByRole("button", { name: "Convert" }).click();
const converted = await expectStatus(page, "Converted 2 rows.");
const jsonDownload = await downloadText(page, "people.json");
if (jsonDownload !== objectsJson) fail(`people.json was ${JSON.stringify(jsonDownload)}`);
if ((await page.getByRole("cell", { name: "Ada" }).count()) < 1) fail("preview missed Ada");
await page.screenshot({ path: path.join(evidence, "converted.png"), fullPage: true });
writeFileSync(path.join(evidence, "aria-converted.txt"), await page.locator("main").ariaSnapshot());
lines.push(
  "action: open /csv-to-json",
  "action: add people.csv",
  "action: click Convert",
  `status: ${converted}`,
  "visible: Ada",
  "download: people.json matched fixtures/people.json",
);

await open(page, "/json-to-csv");
await page.locator("input[type=file]").setInputFiles(path.join(fixtures, "people.json"));
await page.getByRole("button", { name: "Convert" }).click();
const jsonBack = await expectStatus(page, "Converted 2 rows.");
const csvDownload = await downloadText(page, "people.csv");
if (csvDownload !== csvText) fail(`people.csv was ${JSON.stringify(csvDownload)}`);
lines.push("action: open /json-to-csv", "action: add people.json", "action: click Convert", `status: ${jsonBack}`, "download: people.csv matched the sample rows");

await open(page, "/excel-to-csv");
await page.locator("input[type=file]").setInputFiles(path.join(fixtures, "people.xlsx"));
await page.getByRole("button", { name: "Convert" }).click();
const excelStatus = await expectStatus(page, "Converted 2 rows.");
const excelCsv = await downloadText(page, "people.csv");
if (excelCsv !== csvText) fail(`excel csv was ${JSON.stringify(excelCsv)}`);
lines.push("action: open /excel-to-csv", "action: add people.xlsx", "action: click Convert", `status: ${excelStatus}`, "download: people.csv matched the sample rows");

await open(page, "/semicolon-csv-to-json");
const note = await page.getByText("Delimiter is semicolon. JSON shape is objects. Excel uses the first sheet.").innerText();
if (!note.includes("Delimiter is semicolon.")) fail(`note was ${JSON.stringify(note)}`);
await page.locator("input[type=file]").setInputFiles(path.join(fixtures, "people-semicolon.csv"));
await page.getByRole("button", { name: "Convert" }).click();
const semiStatus = await expectStatus(page, "Converted 2 rows.");
const semiJson = await downloadText(page, "people-semicolon.json");
if (semiJson !== objectsJson) fail(`semicolon json was ${JSON.stringify(semiJson)}`);
lines.push(
  "action: open /semicolon-csv-to-json",
  "visible: Delimiter is semicolon.",
  "action: add people-semicolon.csv",
  "action: click Convert",
  `status: ${semiStatus}`,
  "download: people-semicolon.json matched fixtures/people.json",
);

await open(page, "/csv-to-json");
const oversize = path.join(tmpdir(), "plainden-data-oversize.csv");
writeFileSync(oversize, Buffer.alloc(5 * 1024 * 1024 + 1));
await page.locator("input[type=file]").setInputFiles(oversize);
await page.getByRole("button", { name: "Convert" }).click();
const limited = await expectStatus(page, "free fileSize allows 5242880");
if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("See pricing was missing");
lines.push("action: add a csv one byte over 5 MB", "action: click Convert", `status: ${limited}`, "visible: See pricing");

await page.getByRole("textbox", { name: "Preset name" }).fill("Europe");
await page.getByRole("button", { name: "Save preset" }).click();
const saved = await expectStatus(page, "Saved presets are on the paid plan.");
if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("See pricing was missing after save");
lines.push("action: fill Preset name Europe", "action: click Save preset", `status: ${saved}`, "visible: See pricing");

writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
writeFileSync(path.join(evidence, "aria.txt"), await page.locator("main").ariaSnapshot());
await page.screenshot({ path: path.join(evidence, "page.png"), fullPage: true });
await browser.close();
console.log(lines.join("\n"));
