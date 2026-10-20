#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
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

const featureIds = ["scaffold-tool", "landing", "planned-tool", "pricing", "theme", "sign-in"];

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

async function driveScaffold(page, dir) {
  const lines = [];
  await page.getByLabel("Note").fill("Hello");
  await page.getByLabel("Count").fill("1");
  lines.push("action: fill Note Hello");
  lines.push("action: fill Count 1");
  lines.push("action: click Check");
  await page.getByRole("button", { name: "Check" }).click();
  const allowed = "Allowed on the free plan. Format text. Note Hello. Slug scaffold-check.";
  await page.getByRole("status").filter({ hasText: allowed }).waitFor({ timeout: 10_000 });
  const allowedText = await page.getByRole("status").innerText();
  lines.push(`status: ${allowedText}`);
  if (allowedText !== allowed) fail(`allowed status was ${JSON.stringify(allowedText)}`);
  await snap(page, dir, "aria-allowed.txt", "allowed.png");
  await page.getByLabel("Count").fill("4");
  lines.push("action: fill Count 4");
  lines.push("action: click Check");
  await page.getByRole("button", { name: "Check" }).click();
  const blocked = "free perMonth allows 3";
  await page.getByRole("status").filter({ hasText: blocked }).waitFor({ timeout: 10_000 });
  const blockedText = await page.getByRole("status").innerText();
  lines.push(`status: ${blockedText}`);
  if (blockedText !== blocked) fail(`blocked status was ${JSON.stringify(blockedText)}`);
  const upgrade = page.getByRole("link", { name: "See pricing" });
  if ((await upgrade.count()) < 1) fail("See pricing link was missing");
  lines.push("visible: link See pricing");
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
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
  if (!body.includes("$5/mo") || !body.includes("$9/mo")) fail("landing prices were missing");
  const lines = [
    "action: open /",
    `heading: ${heading}`,
    `support: ${href}`,
    "visible: link Invoice generator",
    "visible: $5/mo",
    "visible: $9/mo",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function drivePlanned(page, dir) {
  await page.getByRole("link", { name: "Invoice generator" }).click();
  await page.waitForURL("**/invoice-generator");
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const copy = await page.getByText("This tool is not built yet.").count();
  const check = await page.getByRole("button", { name: "Check" }).count();
  if (heading !== "Invoice generator") fail(`heading was ${heading}`);
  if (copy < 1) fail("placeholder copy was missing");
  if (check > 0) fail("placeholder exposed a Check button");
  const lines = [
    "action: open /",
    "action: click link Invoice generator",
    "url: /invoice-generator",
    `heading: ${heading}`,
    "visible: This tool is not built yet.",
  ];
  await snap(page, dir, "aria.txt", "page.png");
  writeFileSync(path.join(dir, "actions.txt"), `${lines.join("\n")}\n`);
}

async function drivePricing(page, dir) {
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  const body = await page.locator("main").innerText();
  if (heading !== "Pricing") fail(`heading was ${heading}`);
  if (!body.includes("$5/mo") || !body.includes("$9/mo")) fail("monthly prices were missing");
  if (!body.includes("plainden_invoice_month")) fail("invoice lookup key was missing");
  if (body.includes("plainden_scaffold_month")) fail("scaffold price was listed");
  const lines = [
    "action: open /pricing",
    `heading: ${heading}`,
    "visible: $5/mo",
    "visible: $9/mo",
    "visible: plainden_invoice_month",
    "absent: plainden_scaffold_month",
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

const drivers = {
  "scaffold-tool": { path: "/scaffold-check", run: driveScaffold },
  landing: { path: "/", run: driveLanding },
  "planned-tool": { path: "/", run: drivePlanned },
  pricing: { path: "/pricing", run: drivePricing },
  theme: { path: "/", run: driveTheme },
  "sign-in": { path: "/account", run: driveSignIn },
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
