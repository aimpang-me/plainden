import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { expect, test, type Download, type Page, type TestInfo } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { signPaddleWebhook } from "../../lib/payments/signature";
import { mailDir } from "../env";

export const webhookSecret = "pdl_whsec_plainden_e2e";

export const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
] as const;

export type ViewportName = (typeof viewports)[number]["name"];

export function withViewports(register: (viewport: ViewportName) => void): void {
  for (const viewport of viewports) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });
      register(viewport.name);
    });
  }
}

export async function expectPreviewTotal(page: Page, amount: string): Promise<void> {
  const preview = page.getByRole("heading", { name: "Preview" }).locator("xpath=..");
  const row = preview.locator("p").filter({ has: page.getByText("Total", { exact: true }) });
  await expect(row).toContainText(amount);
}

export async function openTool(page: Page, slug: string): Promise<void> {
  await page.goto(slug);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

export async function readDownload(download: Download): Promise<Buffer> {
  const file = await download.path();
  if (file) return readFile(file);
  const saved = path.join(await mkdtemp(path.join(tmpdir(), "plainden-dl-")), download.suggestedFilename());
  await download.saveAs(saved);
  return readFile(saved);
}

export function pdfText(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  const streams = raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g);
  let text = "";
  for (const match of streams) {
    const body = Buffer.from(match[1] ?? "", "latin1");
    let inflated = body;
    try {
      inflated = inflateSync(body);
    } catch {
      inflated = body;
    }
    const source = inflated.toString("latin1");
    for (const hex of source.matchAll(/<([0-9A-Fa-f]+)>/g)) {
      const token = hex[1] ?? "";
      if (token.length % 2 === 0) text += Buffer.from(token, "hex").toString("latin1");
    }
  }
  return text;
}

export async function pageCount(bytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

export function expectPdf(bytes: Buffer): void {
  expect(bytes.subarray(0, 5).toString("utf8")).toBe("%PDF-");
}

export async function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    margin: 1,
    errorCorrectionLevel: "M",
    width: 512,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function qrSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return svg.trim();
}

export async function sampleFiles(): Promise<{ one: string; two: string; jpg: string; huge: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-pdf-"));
  const one = path.join(dir, "one.pdf");
  const two = path.join(dir, "two.pdf");
  const left = await PDFDocument.create();
  left.addPage([200, 200]);
  await writeFile(one, await left.save());
  const right = await PDFDocument.create();
  right.addPage([180, 180]);
  right.addPage([180, 120]);
  await writeFile(two, await right.save());
  const huge = path.join(dir, "huge.pdf");
  await writeFile(huge, Buffer.alloc(26_214_401, 0x25));
  return { one, two, jpg: path.resolve("tools/pdf/fixtures/pixel.jpg"), huge };
}

export async function clickDownload(page: Page, name: string): Promise<Buffer> {
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name, exact: true }).click();
  return readDownload(await pending);
}

export async function signIn(page: Page, info: TestInfo): Promise<void> {
  const email = `ada.${Date.now()}.${info.workerIndex}.${info.retry}@example.com`;
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toHaveText("Check your email for a sign-in link.");
  const link = await readMagicLink(email);
  await page.goto(link);
  await expect(page.locator("#content").getByText(email, { exact: true })).toBeVisible();
}

export async function seedAllToolsPlan(page: Page): Promise<{ userId: string; subscriptionId: string }> {
  const session = await page.request.get("/api/auth/get-session");
  expect(session.ok()).toBeTruthy();
  const body = (await session.json()) as { user?: { id?: string } };
  const userId = body.user?.id;
  if (typeof userId !== "string" || userId.length === 0) throw new Error("signed-in session has no user id");
  const eventId = `evt_${crypto.randomUUID()}`;
  const subscriptionId = `sub_${crypto.randomUUID()}`;
  const payload = {
    event_id: eventId,
    event_type: "transaction.completed",
    occurred_at: new Date().toISOString(),
    data: {
      id: `txn_${eventId}`,
      customer_id: `ctm_${userId}`,
      subscription_id: subscriptionId,
      custom_data: {
        userId,
        entitlementKey: "all",
        priceLookupKey: "plainden_all_month",
      },
    },
  };
  const rawBody = JSON.stringify(payload);
  const signature = signPaddleWebhook(rawBody, webhookSecret, Math.floor(Date.now() / 1000));
  const response = await page.request.post("/api/paddle/webhook", {
    headers: { "paddle-signature": signature, "content-type": "application/json" },
    data: rawBody,
  });
  expect(response.status(), await response.text()).toBe(200);
  return { userId, subscriptionId };
}

export async function readMagicLink(email: string): Promise<string> {
  const dir = path.resolve(mailDir);
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const message = JSON.parse(await readFile(path.join(dir, name), "utf8")) as {
        to?: string;
        magicLinkUrl?: string;
      };
      if (message.to === email && message.magicLinkUrl) return message.magicLinkUrl;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no magic link for ${email}`);
}
