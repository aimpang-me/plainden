import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const port = process.env.PORT ?? "3100";
const base = `http://127.0.0.1:${port}`;
const evidence = path.join(root, "tools/image/evidence");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function within(size, target) {
  return Math.abs(size - target) * 10 <= target;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function noisyPng(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const index = row + 1 + x * 3;
      raw[index] = (x * 17 + y * 13) & 255;
      raw[index + 1] = (x * 9 + y * 29) & 255;
      raw[index + 2] = (x * 3 + y * 7) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function open(page, urlPath) {
  await page.goto(`${base}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
}

async function downloadSize(page, name) {
  return page.evaluate(async (downloadName) => {
    const link = document.querySelector(`a[download="${downloadName}"]`);
    if (!link) return 0;
    const response = await fetch(link.href);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length;
  }, name);
}

const landing = await fetch(base, { signal: AbortSignal.timeout(2000) }).catch(() => null);
if (!landing || landing.status !== 200) {
  fail(`verification server is not on ${base}. Launch it before this proof.`);
}

mkdirSync(evidence, { recursive: true });
const temp = path.join(tmpdir(), "plainden-image-proof");
mkdirSync(temp, { recursive: true });
const pngPath = path.join(temp, "noise.png");
writeFileSync(pngPath, noisyPng(1200, 900));

const pages = [
  { path: "/compress-image-to-100kb", button: "Compress images", target: 102400 },
  { path: "/compress-image-to-200kb", button: "Compress images", target: 204800 },
  { path: "/resize-image-to-20kb", button: "Compress images", target: 20480 },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const lines = [];

try {
  for (const item of pages) {
    await open(page, item.path);
    const intro = await page.locator("main").innerText();
    if (!intro.includes("within 10%")) fail(`${item.path} did not say within 10%`);
    if (!intro.includes("exact byte count")) fail(`${item.path} did not refuse an exact byte count`);
    await page.getByLabel("Images").setInputFiles(pngPath);
    lines.push(`action: add noise.png on ${item.path}`);
    await page.getByRole("button", { name: item.button }).click();
    await page.getByRole("status").filter({ hasText: "bytes" }).waitFor({ timeout: 60_000 });
    const status = await page.getByRole("status").innerText();
    const size = await downloadSize(page, "noise.jpg");
    if (!within(size, item.target)) fail(`${item.path} produced ${size} bytes for target ${item.target}. ${status}`);
    lines.push(`status: ${status}`);
    lines.push(`download: noise.jpg ${size}`);
    if (item.target === 102400) {
      writeFileSync(path.join(evidence, "aria.txt"), await page.locator("main").ariaSnapshot());
      await page.screenshot({ path: path.join(evidence, "page.png"), fullPage: true });
    }
  }

  await open(page, "/compress-image");
  const tiny = path.join(temp, "tiny.png");
  writeFileSync(tiny, noisyPng(8, 8));
  const eleven = Array.from({ length: 11 }, () => tiny);
  await page.getByLabel("Images").setInputFiles(eleven);
  lines.push("action: add 11 tiny images on /compress-image");
  await page.getByRole("button", { name: "Compress images" }).click();
  await page.getByRole("link", { name: "See pricing" }).waitFor({ timeout: 15_000 });
  const blocked = await page.getByRole("status").innerText();
  if (blocked !== "The free plan allows 10 images at a time.") fail(`batch status was ${blocked}`);
  lines.push(`status: ${blocked}`);
  await page.screenshot({ path: path.join(evidence, "upgrade.png"), fullPage: true });

  writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
  console.log("image proof ok");
} finally {
  await browser.close();
}
