#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";

const root = process.cwd();
const skillDir = path.join(root, ".cursor/skills/verify-plainden");
const runDir = path.join(skillDir, ".run");
const evidenceRoot = path.join(skillDir, "evidence");
const pidFile = path.join(runDir, "pid");
const metaFile = path.join(runDir, "meta.json");
const logFile = path.join(runDir, "dev.log");
const port = 3100;
const base = `http://127.0.0.1:${port}`;
const dataDir = path.join(root, ".data/verify-pglite");
const readyText = "Small tools that run in the browser";

const featureIds = [
  "landing",
  "planned-tool",
  "pricing",
  "theme",
  "sign-in",
  "invoice-generator",
  "receipt-generator",
  "pdf",
  "qr",
  "seo",
  "privacy-policy",
  "image",
  "video",
  "data",
  "subtitles",
  "legal-pages",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readPid() {
  if (!existsSync(pidFile)) return null;
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function siteUp() {
  try {
    const response = await fetch(base, { signal: AbortSignal.timeout(1500) });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function landingReady() {
  try {
    const response = await fetch(base, { signal: AbortSignal.timeout(2000) });
    const body = await response.text();
    return response.status === 200 && body.includes(readyText);
  } catch {
    return false;
  }
}

function readMeta() {
  if (!existsSync(metaFile)) return null;
  return JSON.parse(readFileSync(metaFile, "utf8"));
}

async function launch() {
  const existing = readPid();
  if (existing && alive(existing)) {
    fail(`verification server already running as pid ${existing}`);
  }
  if (await siteUp()) {
    fail(`port ${port} is already in use by a process this run did not start`);
  }
  mkdirSync(runDir, { recursive: true });
  const logFd = openSync(logFile, "a");
  const child = spawn("npx", ["next", "dev", "--port", String(port)], {
    cwd: root,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      PORT: String(port),
      PGLITE_DATA_DIR: dataDir,
    },
  });
  if (!child.pid) fail("next dev did not return a pid");
  child.unref();
  writeFileSync(pidFile, `${child.pid}\n`);
  writeFileSync(
    metaFile,
    `${JSON.stringify({ pid: child.pid, port, dataDir: ".data/verify-pglite", base }, null, 2)}\n`,
  );
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const ready = await landingReady();
    if (ready) {
      console.log(`ready ${base} pid ${child.pid}`);
      return;
    }
    if (!alive(child.pid)) fail(`next dev exited before it was ready. See ${logFile}`);
    await delay(500);
  }
  fail(`timed out waiting for ${base}`);
}

async function doctor() {
  const pid = readPid();
  if (!pid || !alive(pid)) fail("no verification server pid is alive");
  const meta = readMeta();
  if (!meta || meta.port !== port || meta.dataDir !== ".data/verify-pglite") {
    fail("meta.json does not record port 3100 and .data/verify-pglite");
  }
  const response = await fetch(base, { signal: AbortSignal.timeout(5000) });
  const body = await response.text();
  if (response.status !== 200) fail(`GET / returned ${response.status}`);
  if (!body.includes(readyText)) fail("GET / did not contain the landing heading");
  console.log(`doctor ok pid ${pid} ${base} data ${meta.dataDir}`);
}

async function openPage(urlPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${base}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  return { browser, page };
}

function evidenceDir(featureId) {
  const dir = path.join(evidenceRoot, featureId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function snap(page, dir, ariaName, imageName) {
  const aria = await page.locator("main").ariaSnapshot();
  writeFileSync(path.join(dir, ariaName), `${aria}\n`);
  await page.screenshot({ path: path.join(dir, imageName), fullPage: true });
}

async function driveLanding(page, dir) {
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const support = page.getByRole("link", { name: "support@plainden.com" });
  const href = await support.getAttribute("href");
  const invoice = await page.getByRole("link", { name: "Invoice generator" }).count();
  const body = await page.locator("main").innerText();
  if (heading !== "Small tools that run in the browser") fail(`heading was ${heading}`);
  if (href !== "mailto:support@plainden.com") fail(`support href was ${href}`);
  if (invoice < 1) fail("Invoice generator link was missing");
  const terms = await page.getByRole("link", { name: "Terms" }).getAttribute("href");
  if (terms !== "/terms") fail(`terms href was ${terms}`);
  if ((await page.getByRole("button", { name: "Decline" }).count()) < 1) fail("cookie decline was missing");
  if ((await page.getByRole("link", { name: "Skip to content" }).count()) < 1) fail("skip link was missing");
  if (!body.includes("$5/mo") || !body.includes("$9/mo")) fail("landing prices were missing");
  const lines = [
    "action: open /",
    `heading: ${heading}`,
    `support: ${href}`,
    "visible: link Invoice generator",
    "visible: link Terms",
    "visible: button Decline",
    "visible: $5/mo",
    "visible: $9/mo",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function drivePlanned(page, dir) {
  const names = [
    "Privacy and terms generator",
    "Privacy policy generator",
    "Image tools",
    "Video compressor",
    "Data converter",
    "Subtitle converter",
    "Cookie and refund policy generator",
    "Receipt generator",
  ];
  for (const name of names) {
    if ((await page.getByRole("link", { name }).count()) > 0) fail(`landing linked hidden ${name}`);
  }
  await page.goto(`${base}/privacy-policy-generator`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const copy = await page.getByText("This tool is not built yet.").count();
  const business = await page.getByLabel("Business name").count();
  if (heading !== "Privacy policy generator") fail(`heading was ${heading}`);
  if (copy > 0) fail("built legal page still showed the placeholder");
  if (business < 1) fail("legal form was missing");
  const lines = [
    "action: open /",
    "absent: hidden wave links",
    "action: open /privacy-policy-generator",
    "url: /privacy-policy-generator",
    `heading: ${heading}`,
    "visible: Business name",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function drivePrivacy(page, dir) {
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const cookie = await page.getByText("The cookie named in this draft is cart_id.").count();
  if (cookie < 1) fail("cookie answer was missing");
  await page.goto(`${base}/refund-policy-generator-for-services`);
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const refund = await page.getByText("Refunds are paid by bank transfer.").count();
  if (refund < 1) fail("refund answer was missing");
  await page.goto(`${base}/privacy-policy-generator-for-app`);
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  await page.getByLabel("Business name").fill("Ada Studio");
  await page.getByText("This service is run by Ada Studio.").waitFor();
  const notice = await page.getByText("This draft is not legal advice.").count();
  if (notice < 1) fail("notice was missing");
  await page.getByRole("button", { name: "Download Markdown" }).click();
  const status = await page.getByRole("status").innerText();
  if (status !== "Markdown and PDF need the legal plan.") fail(`status was ${status}`);
  const pricing = await page.getByRole("link", { name: "See pricing" }).count();
  if (pricing < 1) fail("upgrade link was missing");
  const missing = await page.request.get(`${base}/p/not-a-policy`);
  if (missing.status() !== 404) fail(`missing policy status ${missing.status()}`);
  const lines = [
    "action: open /cookie-policy-generator-for-shop",
    "visible: The cookie named in this draft is cart_id.",
    "action: open /refund-policy-generator-for-services",
    "visible: Refunds are paid by bank transfer.",
    "action: open /privacy-policy-generator-for-app",
    "action: fill Business name Ada Studio",
    "visible: This service is run by Ada Studio.",
    "visible: This draft is not legal advice.",
    "action: click Download Markdown",
    `status: ${status}`,
    "visible: See pricing",
    "action: GET /p/not-a-policy",
    "status: 404",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function fillDocument(page, fields) {
  for (const [label, value] of fields) {
    await page.getByLabel(label).fill(value);
  }
}

async function driveInvoice(page, dir) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const fields = [
    ["Your name", "Ada"],
    ["Client name", "Bea"],
    ["Invoice number", "100"],
    ["Description", "Consulting"],
    ["Quantity", "2"],
    ["Unit price", "10"],
  ];
  await fillDocument(page, fields);
  await page.locator("p").filter({ has: page.getByText("Total", { exact: true }) }).filter({ hasText: "$20.00" }).first().waitFor({ timeout: 10_000 });
  const footer = await page.getByText("made with plainden").count();
  if (footer < 1) fail("free invoice footer was missing");
  if ((await page.getByText("A logo is part of the paid plan.").count()) < 1) fail("free logo note was missing");
  const lines = fields.map(([label, value]) => `action: fill ${label} ${value}`);
  lines.push("visible: Total $20.00");
  lines.push("visible: made with plainden");
  for (let count = 1; count <= 3; count += 1) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;
    lines.push(`action: click Download PDF`);
    lines.push(`download: ${download.suggestedFilename()}`);
  }
  await page.getByRole("button", { name: "Download PDF" }).click();
  lines.push("action: click Download PDF");
  const blocked = "The free plan includes 3 invoices a month.";
  await page.getByRole("status").filter({ hasText: blocked }).waitFor({ timeout: 10_000 });
  const status = await page.getByRole("status").innerText();
  lines.push(`status: ${status}`);
  if (status !== blocked) fail(`invoice status was ${JSON.stringify(status)}`);
  if ((await page.getByRole("link", { name: "See pricing" }).count()) < 1) fail("See pricing link was missing");
  lines.push("visible: link See pricing");
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveReceipt(page, dir) {
  const fields = [
    ["Your name", "Ada"],
    ["Client name", "Bea"],
    ["Receipt number", "R-9"],
    ["Description", "Rent"],
    ["Quantity", "1"],
    ["Unit price", "10"],
  ];
  await fillDocument(page, fields);
  await page.getByLabel("Payment method").selectOption("card");
  await page.locator("p").filter({ has: page.getByText("Total", { exact: true }) }).filter({ hasText: "$10.00" }).first().waitFor({ timeout: 10_000 });
  const stamp = await page.getByText("PAID", { exact: true }).count();
  if (stamp < 1) fail("PAID stamp was missing");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  const lines = [
    ...fields.map(([label, value]) => `action: fill ${label} ${value}`),
    "action: select Payment method card",
    "visible: Total $10.00",
    "visible: PAID",
    "action: click Download PDF",
    `download: ${download.suggestedFilename()}`,
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function drivePricing(page, dir) {
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const body = await page.locator("main").innerText();
  if (heading !== "Pricing") fail(`heading was ${heading}`);
  if (!body.includes("$5/mo") || !body.includes("$9/mo")) fail("monthly prices were missing");
  if (!body.includes("two months free")) fail("annual note was missing");
  if (body.includes("plainden_")) fail("a lookup key was visible");
  const toolForm = page.locator("form").filter({ has: page.getByLabel("Tool") });
  const monthKey = await toolForm.locator("input[name=lookupKey]").inputValue();
  if (monthKey !== "plainden_invoice_month") fail(`invoice checkout key was ${monthKey}`);
  await page.getByText("Annual", { exact: true }).click();
  const annual = await page.locator("main").innerText();
  if (!annual.includes("$50/yr") || !annual.includes("$90/yr")) fail("annual prices were missing");
  await page.getByLabel("Tool").selectOption("qr");
  const yearKey = await toolForm.locator("input[name=lookupKey]").inputValue();
  if (yearKey !== "plainden_qr_year") fail(`qr checkout key was ${yearKey}`);
  if ((await page.getByRole("button", { name: "Checkout" }).count()) !== 2) fail("checkout buttons were missing");
  if ((await page.getByRole("button", { name: "Open billing portal" }).count()) < 1) fail("portal button was missing");
  const lines = [
    "action: open /pricing",
    `heading: ${heading}`,
    "visible: $5/mo",
    "visible: $9/mo",
    "visible: two months free",
    "absent: lookup keys",
    "checkout: plainden_invoice_month",
    "action: select Annual and QR code generator",
    "checkout: plainden_qr_year",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveTheme(page, dir) {
  const lines = ["action: open /", "action: click Switch to dark"];
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await page.locator("html[data-theme='dark']").waitFor({ timeout: 10_000 });
  const dark = await page.locator("html").getAttribute("data-theme");
  lines.push(`data-theme: ${dark}`);
  if (dark !== "dark") fail(`theme was ${dark}`);
  await snap(page, dir, "aria-dark.txt", "dark.png");
  lines.push("action: click Switch to light");
  await page.getByRole("button", { name: "Switch to light" }).click();
  await page.locator("html[data-theme='light']").waitFor({ timeout: 10_000 });
  const light = await page.locator("html").getAttribute("data-theme");
  lines.push(`data-theme: ${light}`);
  if (light !== "light") fail(`theme was ${light}`);
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function readMagicLink(email) {
  const dir = path.join(root, ".dev-mail");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (existsSync(dir)) {
      for (const name of readdirSync(dir)) {
        if (!name.endsWith(".json")) continue;
        const message = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
        if (message.to === email && typeof message.magicLinkUrl === "string") return message.magicLinkUrl;
      }
    }
    await delay(200);
  }
  fail(`no magic link for ${email}`);
}

async function driveSignIn(page, dir) {
  rmSync(path.join(root, ".dev-mail"), { recursive: true, force: true });
  const email = `ada.verify.${Date.now()}@example.com`;
  const lines = ["action: open /account", `action: fill Email ${email}`, "action: click Email me a sign-in link"];
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const sent = "Check your email for a sign-in link.";
  await page.getByRole("status").filter({ hasText: sent }).waitFor({ timeout: 15_000 });
  const status = await page.getByRole("status").innerText();
  lines.push(`status: ${status}`);
  if (status !== sent) fail(`sign-in status was ${JSON.stringify(status)}`);
  lines.push("action: open magic link from .dev-mail");
  await page.goto(await readMagicLink(email), { waitUntil: "domcontentloaded" });
  await page.getByText(email).waitFor({ timeout: 15_000 });
  if ((await page.getByRole("button", { name: "Sign out" }).count()) < 1) fail("Sign out was missing");
  const url = new URL(page.url());
  if (url.pathname !== "/account") fail(`landed on ${url.pathname}`);
  if (url.searchParams.has("error")) fail(`sign-in error ${url.searchParams.get("error")}`);
  lines.push(`visible: ${email}`);
  lines.push("visible: button Sign out");
  lines.push("url: /account");
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function blankPdf(file) {
  const doc = await PDFDocument.create();
  doc.addPage([40, 50]);
  writeFileSync(file, await doc.save());
}

async function drivePdf(page, dir) {
  const intro = await page.locator("main").innerText();
  if (!intro.includes("up to 4 MB")) fail("4mb page did not say up to 4 MB");
  if (!intro.includes("does not promise a 4 MB file")) fail("4mb page promised or omitted the refusal");
  const temp = path.join(root, ".data/verify-pdf");
  mkdirSync(temp, { recursive: true });
  const left = path.join(temp, "left.pdf");
  const right = path.join(temp, "right.pdf");
  await blankPdf(left);
  await blankPdf(right);
  await page.goto(`${base}/merge-pdf`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  await page.getByLabel("PDF files").setInputFiles([left, right]);
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  const merged = "Merged 2 files into 2 pages.";
  await page.getByRole("status").filter({ hasText: merged }).waitFor({ timeout: 20_000 });
  const status = await page.getByRole("status").innerText();
  if (status !== merged) fail(`pdf status was ${JSON.stringify(status)}`);
  const mergeHeading = await page.getByRole("heading", { level: 1 }).innerText();
  if (mergeHeading !== "Merge PDF") fail(`merge heading was ${mergeHeading}`);
  if ((await page.locator('a[download="merged.pdf"]').count()) < 1) fail("merged.pdf link was missing");
  const lines = [
    "action: open /compress-pdf-to-4mb",
    "visible: up to 4 MB",
    "visible: does not promise a 4 MB file",
    "action: open /merge-pdf",
    "action: add left.pdf and right.pdf",
    "action: click Merge PDFs",
    `status: ${status}`,
    "visible: merged.pdf",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveQr(page, dir) {
  const linkValue = await page.getByRole("textbox", { name: "Link" }).inputValue();
  await page.getByRole("button", { name: "Create" }).click();
  const downloaded = "Downloaded PNG.";
  await page.getByRole("status").filter({ hasText: downloaded }).waitFor({ timeout: 15_000 });
  const staticStatus = await page.getByRole("status").innerText();
  if (staticStatus !== downloaded) fail(`qr status was ${JSON.stringify(staticStatus)}`);
  if ((await page.getByRole("img", { name: "QR code" }).count()) < 1) fail("qr preview was not an image");
  await page.goto(`${base}/dynamic-qr-code`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  await page.getByRole("button", { name: "Create" }).click();
  const blocked = "Saving QR codes is part of the paid plan.";
  await page.getByRole("status").filter({ hasText: blocked }).waitFor({ timeout: 10_000 });
  const dynamicStatus = await page.getByRole("status").innerText();
  if (dynamicStatus !== blocked) fail(`dynamic status was ${JSON.stringify(dynamicStatus)}`);
  const missing = await page.request.get(`${base}/q/not-a-code`, { maxRedirects: 0 });
  if (missing.status() !== 404) fail(`missing qr status was ${missing.status()}`);
  const lines = [
    "action: open /qr-code-generator-no-expiration",
    `link: ${linkValue}`,
    "action: click Create",
    `status: ${staticStatus}`,
    "action: open /dynamic-qr-code",
    "action: click Create",
    `status: ${dynamicStatus}`,
    "action: GET /q/not-a-code",
    "status: 404",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveSeo(page, dir) {
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  if (canonical !== "https://plainden.com") fail(`canonical was ${canonical}`);
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().innerText();
  if (!jsonLd.includes('"@type":"WebSite"') && !jsonLd.includes('"@type": "WebSite"')) {
    fail("home JSON-LD missed WebSite");
  }
  const sitemap = await page.request.get(`${base}/sitemap.xml`);
  const sitemapBody = await sitemap.text();
  if (sitemap.status() !== 200) fail(`sitemap status ${sitemap.status()}`);
  const required = [
    "https://plainden.com/invoice-generator",
    "https://plainden.com/merge-pdf",
    "https://plainden.com/qr-code-generator",
  ];
  for (const loc of required) {
    if (!sitemapBody.includes(`<loc>${loc}</loc>`)) fail(`sitemap missed ${loc}`);
  }
  const hidden = [
    "https://plainden.com/privacy-policy-generator",
    "https://plainden.com/merge-pdf-files",
    "https://plainden.com/compress-image",
    "https://plainden.com/receipt-generator",
    "https://plainden.com/compress-video",
    "https://plainden.com/csv-to-json",
    "https://plainden.com/srt-to-vtt",
    "https://plainden.com/cookie-policy-generator",
  ];
  for (const loc of hidden) {
    if (sitemapBody.includes(`<loc>${loc}</loc>`)) fail(`sitemap listed hidden ${loc}`);
  }
  const robots = await page.request.get(`${base}/robots.txt`);
  const robotsBody = await robots.text();
  if (robots.status() !== 200) fail(`robots status ${robots.status()}`);
  if (robotsBody.includes("Allow: /")) fail(`robots allowed the private site: ${robotsBody}`);
  if (!robotsBody.includes("Disallow: /")) fail(`robots missed Disallow: ${robotsBody}`);
  if (!robotsBody.includes("Sitemap: https://plainden.com/sitemap.xml")) fail(`robots missed sitemap: ${robotsBody}`);
  const lines = [
    "action: open /",
    `canonical: ${canonical}`,
    "visible: JSON-LD WebSite",
    "action: GET /sitemap.xml",
    "status: 200",
    ...required.map((loc) => `loc: ${loc}`),
    "action: GET /robots.txt",
    "status: 200",
    "visible: Disallow: /",
    "visible: Sitemap: https://plainden.com/sitemap.xml",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveImage(page, dir) {
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  if (heading !== "Image tools") fail(`heading was ${heading}`);
  const placeholder = await page.getByText("This tool is not built yet.").count();
  if (placeholder > 0) fail("image page still showed the placeholder");
  await page.getByLabel("Images").setInputFiles(path.join(root, "e2e/tools-b/fixtures/frame.png"));
  await page.getByRole("button", { name: "Compress images" }).click();
  const link = page.locator("main a[download]").first();
  await link.waitFor({ timeout: 30_000 });
  const name = await link.getAttribute("download");
  if (!name || !name.endsWith(".jpg")) fail(`download was ${name}`);
  const lines = [
    "action: open /compress-image",
    `heading: ${heading}`,
    "action: add frame.png",
    "action: click Compress images",
    `download: ${name}`,
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveVideo(page, dir) {
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  if (heading !== "Compress a video for Discord") fail(`heading was ${heading}`);
  await page.getByLabel("Video file").setInputFiles(path.join(root, "e2e/tools-b/fixtures/clip.mp4"));
  await page.getByRole("button", { name: "Compress video" }).click();
  const link = page.locator("main a[download]").first();
  await link.waitFor({ timeout: 120_000 });
  const name = await link.getAttribute("download");
  if (!name || !name.endsWith(".mp4")) fail(`download was ${name}`);
  const lines = [
    "action: open /compress-video-for-discord",
    `heading: ${heading}`,
    "action: add clip.mp4",
    "action: click Compress video",
    `download: ${name}`,
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveData(page, dir) {
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  if (heading !== "CSV, JSON, and Excel converter") fail(`heading was ${heading}`);
  await page.getByLabel("CSV file").setInputFiles(path.join(root, "e2e/tools-b/fixtures/sample.csv"));
  await page.getByRole("button", { name: "Convert" }).click();
  await page.getByRole("cell", { name: "Ada", exact: true }).waitFor({ timeout: 10_000 });
  const status = await page.getByRole("status").innerText();
  if (!status.startsWith("Converted ")) fail(`status was ${status}`);
  const lines = [
    "action: open /csv-to-json",
    `heading: ${heading}`,
    "action: add sample.csv",
    "action: click Convert",
    "visible: cell Ada",
    `status: ${status}`,
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveSubtitles(page, dir) {
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  if (heading !== "Subtitle converter") fail(`heading was ${heading}`);
  await page.getByLabel("Subtitle files").setInputFiles(path.join(root, "e2e/tools-b/fixtures/sample.srt"));
  await page.getByRole("button", { name: "Convert" }).click();
  await page.getByRole("status").filter({ hasText: "Converted 1 file." }).waitFor({ timeout: 10_000 });
  const status = await page.getByRole("status").innerText();
  if (status !== "Converted 1 file.") fail(`status was ${status}`);
  const lines = [
    "action: open /srt-to-vtt",
    `heading: ${heading}`,
    "action: add sample.srt",
    "action: click Convert",
    `status: ${status}`,
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function driveLegal(page, dir) {
  const sentence =
    "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.";
  const terms = await page.getByRole("heading", { level: 1 }).innerText();
  if (terms !== "Terms") fail(`terms heading was ${terms}`);
  if ((await page.getByText(sentence).count()) < 1) fail("paddle sentence was missing on terms");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.goto(`${base}/privacy`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  await page.getByRole("button", { name: "Decline" }).waitFor({ state: "detached", timeout: 5_000 });
  const privacy = await page.getByRole("heading", { level: 1 }).innerText();
  if (privacy !== "Privacy") fail(`privacy heading was ${privacy}`);
  await page.goto(`${base}/refund`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const refund = await page.getByRole("heading", { level: 1 }).innerText();
  if (refund !== "Refunds") fail(`refund heading was ${refund}`);
  if ((await page.getByText(sentence).count()) < 1) fail("paddle sentence was missing on refunds");
  const health = await page.request.get(`${base}/api/health`);
  const healthBody = await health.json();
  if (health.status() !== 200 || healthBody.ok !== true) fail(`health was ${health.status()} ${JSON.stringify(healthBody)}`);
  const missing = await page.request.get(`${base}/p/${"ab".repeat(16)}`);
  if (missing.status() !== 404) fail(`unknown policy status was ${missing.status()}`);
  const lines = [
    "action: open /terms",
    "visible: Paddle merchant sentence",
    "action: click Decline",
    "action: open /privacy",
    "absent: cookie banner",
    "action: open /refund",
    "visible: Paddle merchant sentence",
    "action: GET /api/health",
    "status: 200",
    "action: GET unknown /p id",
    "status: 404",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

const drivers = {
  landing: { path: "/", run: driveLanding },
  "planned-tool": { path: "/", run: drivePlanned },
  pricing: { path: "/pricing", run: drivePricing },
  theme: { path: "/", run: driveTheme },
  "sign-in": { path: "/account", run: driveSignIn },
  "invoice-generator": { path: "/invoice-generator", run: driveInvoice },
  "receipt-generator": { path: "/receipt-generator", run: driveReceipt },
  pdf: { path: "/compress-pdf-to-4mb", run: drivePdf },
  qr: { path: "/qr-code-generator-no-expiration", run: driveQr },
  seo: { path: "/", run: driveSeo },
  "privacy-policy": { path: "/cookie-policy-generator-for-shop", run: drivePrivacy },
  image: { path: "/compress-image", run: driveImage },
  video: { path: "/compress-video-for-discord", run: driveVideo },
  data: { path: "/csv-to-json", run: driveData },
  subtitles: { path: "/srt-to-vtt", run: driveSubtitles },
  "legal-pages": { path: "/terms", run: driveLegal },
};

async function drive(featureId) {
  if (!featureIds.includes(featureId)) fail(`unknown feature ${featureId}`);
  const pid = readPid();
  if (!pid || !alive(pid)) fail("doctor would fail: start the verification server first");
  const spec = drivers[featureId];
  const dir = evidenceDir(featureId);
  const { browser, page } = await openPage(spec.path);
  try {
    await spec.run(page, dir);
  } finally {
    await browser.close();
  }
  console.log(`drove ${featureId} evidence ${path.relative(root, dir)}`);
}

function signalGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return;
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      return;
    }
  }
}

async function cleanup() {
  const pid = readPid();
  if (pid && alive(pid)) {
    signalGroup(pid, "SIGTERM");
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline && alive(pid)) await delay(200);
    if (alive(pid)) signalGroup(pid, "SIGKILL");
    console.log(`stopped pid ${pid}`);
  } else {
    console.log("no live verification pid");
  }
  rmSync(runDir, { recursive: true, force: true });
  rmSync(dataDir, { recursive: true, force: true });
  console.log("cleanup removed .run and .data/verify-pglite");
  console.log("evidence left in place");
}

const [command, arg] = process.argv.slice(2);

if (command === "launch") {
  await launch();
} else if (command === "doctor") {
  await doctor();
} else if (command === "drive") {
  if (!arg) fail("drive needs a feature id");
  await drive(arg);
} else if (command === "cleanup") {
  await cleanup();
} else {
  fail("commands: launch, doctor, drive <feature-id>, cleanup");
}
