import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const root = process.cwd();
const base = "http://127.0.0.1:3100";
const evidence = path.join(root, "tools/pdf/evidence");
const jpgPath = path.join(root, "tools/pdf/fixtures/pixel.jpg");

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function blankPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([40, 50]);
  return doc.save();
}

async function photoPdf() {
  const jpeg = new Uint8Array(readFileSync(jpgPath));
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpeg);
  const page = doc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return doc.save();
}

async function pdfHeader(page, name) {
  return page.evaluate(async (downloadName) => {
    const link = document.querySelector(`a[download="${downloadName}"]`);
    if (!link) return "";
    const response = await fetch(link.href);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return String.fromCharCode(...bytes.slice(0, 5));
  }, name);
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

const lines = [];

const landing = await fetch(base, { signal: AbortSignal.timeout(2000) }).catch(() => null);
if (!landing || landing.status !== 200) {
  fail("verification server is not on http://127.0.0.1:3100. Launch it with plainden-verify.mjs first.");
}

mkdirSync(evidence, { recursive: true });
const left = await blankPdf();
const right = await blankPdf();
const photo = await photoPdf();
const oversize = Buffer.alloc(25 * 1024 * 1024 + 1);
const temp = path.join(tmpdir(), "plainden-pdf-proof");
mkdirSync(temp, { recursive: true });
writeFileSync(path.join(temp, "left.pdf"), left);
writeFileSync(path.join(temp, "right.pdf"), right);
writeFileSync(path.join(temp, "photo.pdf"), photo);
writeFileSync(path.join(temp, "oversize.bin"), oversize);
const twoDoc = await PDFDocument.load(photo);
const donor = await PDFDocument.load(left);
const [copied] = await twoDoc.copyPages(donor, [0]);
twoDoc.addPage(copied);
writeFileSync(path.join(temp, "two.pdf"), await twoDoc.save());

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await open(page, "/compress-pdf-to-4mb");
  const intro = await page.locator("main").innerText();
  if (!intro.includes("up to 4 MB")) fail("4mb page did not say up to 4 MB");
  if (!intro.includes("does not promise a 4 MB file")) fail("4mb page promised or omitted the refusal");
  if (!intro.includes("Photo compression aims for up to 4 MB.")) fail("4mb preset note was missing");
  lines.push("action: open /compress-pdf-to-4mb");
  lines.push("visible: up to 4 MB");
  lines.push("visible: does not promise a 4 MB file");
  await page.screenshot({ path: path.join(evidence, "4mb.png"), fullPage: true });

  await open(page, "/split-pdf-pages");
  const rangeValue = await page.getByLabel("Pages").inputValue();
  if (rangeValue !== "1") fail(`Pages preset was ${JSON.stringify(rangeValue)}`);
  lines.push("action: open /split-pdf-pages");
  lines.push("pages: 1");

  await open(page, "/merge-pdf");
  await page.getByLabel("PDF files").setInputFiles(path.join(temp, "oversize.bin"));
  lines.push("action: add oversize.bin");
  lines.push("action: click Merge PDFs");
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expectStatus(page, "free fileSize allows 26214400");
  if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("size block missed See pricing");
  lines.push("status: free fileSize allows 26214400");
  lines.push("visible: link See pricing");
  await page.getByRole("button", { name: "Remove oversize.bin" }).click();
  lines.push("action: remove oversize.bin");

  await open(page, "/jpg-to-pdf");
  await page.getByLabel("JPG files").setInputFiles(jpgPath);
  lines.push("action: open /jpg-to-pdf");
  lines.push("action: click Make PDF");
  await page.getByRole("button", { name: "Make PDF" }).click();
  await expectStatus(page, "Made a PDF with 1 page.");
  if ((await pdfHeader(page, "images.pdf")) !== "%PDF-") fail("images.pdf was not a PDF");
  lines.push("status: Made a PDF with 1 page.");
  lines.push("download: images.pdf %PDF-");
  await page.screenshot({ path: path.join(evidence, "allowed.png"), fullPage: true });

  await open(page, "/compress-pdf");
  await page.getByLabel("PDF file").setInputFiles(path.join(temp, "photo.pdf"));
  lines.push("action: open /compress-pdf");
  lines.push("action: click Compress PDF");
  await page.getByRole("button", { name: "Compress PDF" }).click();
  await page.getByRole("status").filter({ hasText: "Checked 1 JPEG image." }).waitFor({ timeout: 20_000 });
  const compressStatus = await page.getByRole("status").innerText();
  if (!/^Checked 1 JPEG image\. Encoded 1\. Recompressed \d+\.$/.test(compressStatus)) {
    fail(`compress status was ${JSON.stringify(compressStatus)}`);
  }
  if ((await pdfHeader(page, "compressed.pdf")) !== "%PDF-") fail("compressed.pdf was not a PDF");
  lines.push(`status: ${compressStatus}`);
  lines.push("download: compressed.pdf %PDF-");

  await open(page, "/split-pdf");
  await page.getByLabel("PDF file").setInputFiles(path.join(temp, "two.pdf"));
  lines.push("action: open /split-pdf");
  lines.push("action: click Split PDF");
  await page.getByRole("button", { name: "Split PDF" }).click();
  await expectStatus(page, "Split into 2 PDFs.");
  if ((await pdfHeader(page, "page-1.pdf")) !== "%PDF-") fail("page-1.pdf was not a PDF");
  if ((await pdfHeader(page, "page-2.pdf")) !== "%PDF-") fail("page-2.pdf was not a PDF");
  lines.push("status: Split into 2 PDFs.");
  lines.push("download: page-1.pdf %PDF-");
  lines.push("download: page-2.pdf %PDF-");

  await open(page, "/merge-pdf");
  await page.getByLabel("PDF files").setInputFiles(path.join(temp, "left.pdf"));
  await page.getByLabel("PDF files").setInputFiles(path.join(temp, "right.pdf"));
  lines.push("action: open /merge-pdf");
  lines.push("action: click Merge PDFs");
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expectStatus(page, "Merged 2 files into 2 pages.");
  if ((await pdfHeader(page, "merged.pdf")) !== "%PDF-") fail("merged.pdf was not a PDF");
  lines.push("status: Merged 2 files into 2 pages.");
  lines.push("download: merged.pdf %PDF-");

  lines.push("action: click Merge PDFs");
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expectStatus(page, "Merged 2 files into 2 pages.");
  lines.push("status: Merged 2 files into 2 pages.");

  lines.push("action: click Merge PDFs");
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expectStatus(page, "free perDay allows 5");
  if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("day block missed See pricing");
  lines.push("status: free perDay allows 5");
  lines.push("visible: link See pricing");
  const aria = await page.locator("main").ariaSnapshot();
  writeFileSync(path.join(evidence, "aria.txt"), `${aria}\n`);
  await page.screenshot({ path: path.join(evidence, "page.png"), fullPage: true });
  writeFileSync(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
  console.log("pdf proof ok");
} finally {
  await browser.close();
}
