import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const base = "http://127.0.0.1:3100";
const evidence = path.join(root, "tools/video/evidence");
const sample = path.join(root, "tools/video/fixtures/sample.mp4");
const discordCap = 8 * 1024 * 1024;

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function open(page, urlPath) {
  await page.goto(`${base}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
}

const lines = [];
const landing = await fetch(base, { signal: AbortSignal.timeout(2000) }).catch(() => null);
if (!landing || landing.status !== 200) {
  fail("verification server is not on http://127.0.0.1:3100. Launch it with plainden-verify.mjs first.");
}

mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await open(page, "/compress-video-for-discord");
  const intro = await page.locator("main").innerText();
  if (!intro.includes("under 8 MB")) fail("discord page did not say under 8 MB");
  if (!intro.includes("This page starts on the Discord preset. The target is under 8 MB.")) {
    fail("discord preset note was missing");
  }
  const preset = await page.getByLabel("Preset").inputValue();
  if (preset !== "discord") fail(`preset was ${JSON.stringify(preset)}`);
  lines.push("action: open /compress-video-for-discord");
  lines.push("visible: under 8 MB");
  lines.push("preset: discord");

  await page.getByLabel("Video file").setInputFiles(sample);
  lines.push("action: add sample.mp4");
  lines.push("action: click Compress video");
  await page.getByRole("button", { name: "Compress video" }).click();
  await page.getByRole("status").filter({ hasText: "Compressed to" }).waitFor({ timeout: 180_000 });
  const status = await page.getByRole("status").innerText();
  const matched = /^Compressed to (\d+) bytes, under the Discord 8 MB limit\.$/.exec(status);
  if (!matched) fail(`status was ${JSON.stringify(status)}`);
  const reported = Number(matched[1]);
  const bytes = await page.evaluate(async () => {
    const link = document.querySelector('a[download="compressed.mp4"]');
    if (!link) return [];
    const response = await fetch(link.href);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  if (bytes.length !== reported) fail(`download was ${bytes.length} bytes, status said ${reported}`);
  if (bytes.length >= discordCap) fail(`download was ${bytes.length} bytes, not under ${discordCap}`);
  const mark = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (mark !== "ftyp") fail(`download mark was ${JSON.stringify(mark)}`);
  lines.push(`status: ${status}`);
  lines.push(`download: compressed.mp4 ${bytes.length} bytes ftyp`);
  await page.screenshot({ path: path.join(evidence, "discord.png"), fullPage: true });

  await open(page, "/compress-video-to-720p");
  const heightPreset = await page.getByLabel("Preset").inputValue();
  if (heightPreset !== "720p") fail(`720p preset was ${JSON.stringify(heightPreset)}`);
  lines.push("action: open /compress-video-to-720p");
  lines.push("preset: 720p");
  await page.getByLabel("Video file").setInputFiles(sample);
  lines.push("action: add sample.mp4");
  lines.push("action: click Compress video");
  await page.getByRole("button", { name: "Compress video" }).click();
  await page.getByRole("status").filter({ hasText: "at 720p" }).waitFor({ timeout: 180_000 });
  const hdStatus = await page.getByRole("status").innerText();
  const hdMatched = /^Compressed to (\d+) bytes at 720p\.$/.exec(hdStatus);
  if (!hdMatched) fail(`720p status was ${JSON.stringify(hdStatus)}`);
  const hdBytes = await page.evaluate(async () => {
    const link = document.querySelector('a[download="compressed.mp4"]');
    if (!link) return [];
    const response = await fetch(link.href);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  if (hdBytes.length !== Number(hdMatched[1])) fail(`720p download was ${hdBytes.length} bytes, status said ${hdMatched[1]}`);
  const hdMark = String.fromCharCode(hdBytes[4], hdBytes[5], hdBytes[6], hdBytes[7]);
  if (hdMark !== "ftyp") fail(`720p download mark was ${JSON.stringify(hdMark)}`);
  lines.push(`status: ${hdStatus}`);
  lines.push(`download: compressed.mp4 ${hdBytes.length} bytes ftyp`);

  const aria = await page.locator("main").ariaSnapshot();
  writeFileSync(path.join(evidence, "aria.txt"), `${aria}\n`);
  await page.screenshot({ path: path.join(evidence, "page.png"), fullPage: true });
  writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
  const sourceBytes = readFileSync(sample).length;
  lines.push(`source: sample.mp4 ${sourceBytes} bytes`);
  writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
  console.log(`video proof ok discord ${bytes.length} bytes, 720p ${hdBytes.length} bytes`);
} finally {
  await browser.close();
}
