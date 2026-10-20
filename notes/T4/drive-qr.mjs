import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:3100";
const evidence = path.resolve("notes/T4/evidence/qr");
const codeId = "11111111-1111-4111-8111-111111111111";
const lines = [];

await mkdir(evidence, { recursive: true });

function note(line) {
  lines.push(line);
  process.stdout.write(`${line}\n`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${base}/qr-code-generator-no-expiration`);
await page.waitForSelector("html[data-hydrated='true']");
const link = page.getByRole("textbox", { name: "Link" });
note(`link value ${await link.inputValue()}`);
await page.getByRole("button", { name: "Create" }).click();
await page.getByRole("status").filter({ hasText: "Downloaded PNG." }).waitFor();
note(`static status ${(await page.getByRole("status").allInnerTexts()).join(" | ")}`);
await page.screenshot({ path: path.join(evidence, "static.png"), fullPage: true });

await page.goto(`${base}/dynamic-qr-code`);
await page.waitForSelector("html[data-hydrated='true']");
await page.getByRole("button", { name: "Create" }).click();
await page.getByRole("status").filter({ hasText: "free savedItems allows 0" }).waitFor();
const upgrade = page.getByRole("link", { name: "See pricing" });
note(`upgrade href ${await upgrade.getAttribute("href")}`);
note(`dynamic status ${(await page.getByRole("status").allInnerTexts()).join(" | ")}`);
await page.screenshot({ path: path.join(evidence, "upgrade.png"), fullPage: true });
await browser.close();

const first = await fetch(`${base}/q/${codeId}`, { redirect: "manual" });
const second = await fetch(`${base}/q/${codeId}`, { redirect: "manual" });
note(`first status ${first.status} location ${first.headers.get("location")} scans ${first.headers.get("x-plainden-scans")}`);
note(`second status ${second.status} location ${second.headers.get("location")} scans ${second.headers.get("x-plainden-scans")}`);

await writeFile(path.join(evidence, "actions.txt"), `${lines.join("\n")}\n`);
