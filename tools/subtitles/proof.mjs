import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const base = "http://127.0.0.1:3100";
const evidence = path.join(root, "tools/subtitles/evidence");
const sample = path.join(root, "tools/subtitles/fixtures/sample.srt");

const shiftedVtt = `WEBVTT

00:00:02.000 --> 00:00:05.000
Hello world

00:00:06.500 --> 00:00:08.000
Second line
continues
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function open(page, urlPath) {
  await page.goto(`${base}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
}

async function expectStatus(page, text) {
  await page.getByRole("status").filter({ hasText: text }).waitFor({ timeout: 20_000 });
  const actual = await page.getByRole("status").innerText();
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
const second = path.join(tmpdir(), "plainden-subtitle-second.srt");
copyFileSync(sample, second);
const lines = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await open(page, "/shift-subtitle-timing");
  const shiftValue = await page.getByLabel("Timing shift (ms)").inputValue();
  if (shiftValue !== "1000") fail(`shift preset was ${JSON.stringify(shiftValue)}`);
  const shiftIntro = await page.locator("main").innerText();
  if (!shiftIntro.includes("This page starts the shift at 1000 ms.")) fail("shift note was missing");
  lines.push("action: open /shift-subtitle-timing");
  lines.push("shift: 1000");
  lines.push("visible: This page starts the shift at 1000 ms.");

  await open(page, "/srt-to-vtt");
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  if (heading !== "Subtitle converter") fail(`heading was ${JSON.stringify(heading)}`);
  const locked = await page.locator("main").innerText();
  if (!locked.includes("Output is WebVTT.")) fail("srt-to-vtt did not lock WebVTT");
  if ((await page.getByRole("combobox", { name: "Output" }).count()) !== 0) fail("srt-to-vtt showed an output picker");
  if ((await page.getByRole("link", { name: "plainden" }).count()) < 1) fail("header link plainden was missing");
  await page.getByLabel("Subtitle files").setInputFiles(sample);
  await page.getByLabel("Timing shift (ms)").fill("1000");
  lines.push("action: open /srt-to-vtt");
  lines.push("action: add sample.srt");
  lines.push("action: set shift 1000");
  lines.push("action: click Convert");
  await page.getByRole("button", { name: "Convert" }).click();
  await expectStatus(page, "Converted 1 file.");
  const vtt = await downloadText(page, "sample.vtt");
  if (vtt !== shiftedVtt) fail(`sample.vtt was ${JSON.stringify(vtt)}`);
  lines.push("status: Converted 1 file.");
  lines.push("download: sample.vtt matches the one second delay");
  await page.screenshot({ path: path.join(evidence, "converted.png"), fullPage: true });

  const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:07,000
Second line
continues
`;
  await open(page, "/srt-converter");
  if ((await page.getByRole("combobox", { name: "Output" }).count()) !== 1) fail("srt-converter hid the output picker");
  await page.getByLabel("Output").selectOption("srt");
  await page.getByLabel("Subtitle files").setInputFiles(sample);
  lines.push("action: open /srt-converter");
  lines.push("action: choose SRT");
  lines.push("action: add sample.srt");
  lines.push("action: click Convert");
  await page.getByRole("button", { name: "Convert" }).click();
  await expectStatus(page, "Converted 1 file.");
  const srt = await downloadText(page, "sample.srt");
  if (srt !== sampleSrt) fail(`sample.srt was ${JSON.stringify(srt)}`);
  lines.push("status: Converted 1 file.");
  lines.push("download: sample.srt matches the source cues");

  await open(page, "/srt-to-vtt");
  await page.getByLabel("Subtitle files").setInputFiles([sample, second]);
  lines.push("action: add sample.srt and second.srt");
  lines.push("action: click Convert");
  await page.getByRole("button", { name: "Convert" }).click();
  await expectStatus(page, "The free plan converts one subtitle file at a time.");
  if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("batch block missed See pricing");
  lines.push("status: The free plan converts one subtitle file at a time.");
  lines.push("visible: link See pricing");
  const aria = await page.locator("main").ariaSnapshot();
  writeFileSync(path.join(evidence, "aria.txt"), `${aria}\n`);
  await page.screenshot({ path: path.join(evidence, "page.png"), fullPage: true });
  writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
  console.log("subtitle proof ok");
} finally {
  await browser.close();
}
