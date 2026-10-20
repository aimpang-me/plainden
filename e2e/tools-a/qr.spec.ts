import { expect, test, type Page } from "@playwright/test";
import { openTool, qrPng, qrSvg, readDownload, seedAllToolsPlan, signIn, withViewports } from "./support";

test.describe.configure({ timeout: 90_000 });

const linkPayload = "https://example.com/";
const wifiPayload = "WIFI:T:WPA;S:Cafe;P:secret;H:false;;";
const textPayload = "Ship the static code.";
const cardPayload = "BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nTEL:+15555550100\nEMAIL:ada@example.com\nORG:Plainden\nEND:VCARD";

withViewports(() => {
  test("a static link QR downloads a PNG of that URL", async ({ page }) => {
    await openTool(page, "/qr-code-generator-no-expiration");
    await expect(page.getByRole("heading", { level: 1, name: "QR code that never expires" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Link", exact: true })).toHaveValue("https://example.com");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Create" }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("plainden-qr.png");
    await expect(page.getByRole("status")).toHaveText("Downloaded PNG.");
    const bytes = await readDownload(download);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(512);
    expect(bytes.readUInt32BE(20)).toBe(512);
    expect(await pngFingerprint(page, bytes)).toBe(await pngFingerprint(page, await qrPng(linkPayload)));
    await expect(page.getByRole("img", { name: "QR code" })).toBeVisible();
  });

  test("publishing a dynamic code on the free plan shows the pricing prompt", async ({ page }) => {
    await openTool(page, "/dynamic-qr-code");
    await expect(page.getByRole("heading", { level: 1, name: "Dynamic QR code with scan counts" })).toBeVisible();
    await expect(page.getByLabel("Output")).toHaveValue("publish");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("status")).toHaveText("free savedItems allows 0");
    await expect(page.getByRole("link", { name: "See pricing" })).toBeVisible();
  });
});

test("wifi, text, and contact codes download the matching SVG", async ({ page }) => {
  await openTool(page, "/wifi-qr-code");
  await expect(page.getByLabel("Network name")).toHaveValue("Cafe");
  await page.getByRole("combobox", { name: "File", exact: true }).selectOption("svg");
  expect((await svgDownload(page)).trim()).toBe(await qrSvg(wifiPayload));

  await openTool(page, "/text-qr-code");
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue(textPayload);
  await page.getByRole("combobox", { name: "File", exact: true }).selectOption("svg");
  expect((await svgDownload(page)).trim()).toBe(await qrSvg(textPayload));

  await openTool(page, "/vcard-qr-code");
  await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
  await page.getByRole("combobox", { name: "File", exact: true }).selectOption("svg");
  expect((await svgDownload(page)).trim()).toBe(await qrSvg(cardPayload));
});

test("an unknown dynamic code is a 404", async ({ page }) => {
  const response = await page.request.get("/q/not-a-code", { maxRedirects: 0 });
  expect(response.status()).toBe(404);
});

test("a paid dynamic code redirects and counts each scan", async ({ page }) => {
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  const entitlement = page.waitForResponse((response) => response.url().includes("/api/entitlement?key=qr"));
  await openTool(page, "/dynamic-qr-code");
  expect(await (await entitlement).json()).toEqual({ entitlementKey: "qr", plan: "paid" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Published \/q\/[0-9a-f-]{36}\.$/);
  const status = await page.getByRole("status").innerText();
  const id = status.slice("Published /q/".length, -1);
  const first = await page.request.get(`/q/${id}`, { maxRedirects: 0 });
  expect(first.status()).toBe(302);
  expect(first.headers().location).toBe("https://example.com/");
  expect(first.headers()["x-plainden-scans"]).toBe("1");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("status")).toHaveText(`Editing /q/${id}.`);
  await page.getByRole("textbox", { name: "Link", exact: true }).fill("https://example.org/next");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved changes.");
  const second = await page.request.get(`/q/${id}`, { maxRedirects: 0 });
  expect(second.status()).toBe(302);
  expect(second.headers().location).toBe("https://example.org/next");
  expect(second.headers()["x-plainden-scans"]).toBe("2");
});

async function pngFingerprint(page: Page, bytes: Buffer): Promise<string> {
  return page.evaluate(async (base64) => {
    const binary = atob(base64);
    const raw = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) raw[index] = binary.charCodeAt(index);
    const bitmap = await createImageBitmap(new Blob([raw], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return "no-canvas";
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 2166136261;
    for (let index = 0; index < image.data.length; index += 1) {
      hash ^= image.data[index] ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    return `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16)}`;
  }, bytes.toString("base64"));
}

async function svgDownload(page: Page): Promise<string> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("plainden-qr.svg");
  await expect(page.getByRole("status")).toHaveText("Downloaded SVG.");
  return (await readDownload(download)).toString("utf8");
}
