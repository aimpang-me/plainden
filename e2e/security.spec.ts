import { expect, test } from "@playwright/test";
import { origin } from "./env";
import { openTool, seedAllToolsPlan, signIn } from "./tools-a/support";

test.describe.configure({ timeout: 90_000 });

test("signed-out writes are refused", async ({ request }) => {
  const invoices = await request.post("/api/invoices", { data: {} });
  expect(invoices.status()).toBe(401);
  expect(await invoices.json()).toEqual({ error: "sign in required" });

  const qr = await request.post("/api/qr", { data: { type: "publish", targetUrl: "https://example.com", logo: null } });
  expect(qr.status()).toBe(401);
  expect(await qr.json()).toEqual({
    ok: false,
    code: "signed-out",
    reason: "Sign in to publish a dynamic code.",
  });

  const policies = await request.post("/api/policies", { data: {} });
  expect(policies.status()).toBe(401);
  expect(await policies.json()).toEqual({ error: "sign in required" });

  const presets = await request.post("/api/data-presets", { data: {} });
  expect(presets.status()).toBe(401);
  expect(await presets.json()).toEqual({ error: "sign in required" });
});

test("a cross-origin write is refused and another account cannot read a saved invoice", async ({ page, browser }) => {
  await signIn(page, test.info());
  await seedAllToolsPlan(page);
  const foreign = {
    origin: "https://evil.example",
    "content-type": "application/json",
  };
  const invoiceWrite = await page.request.post("/api/invoices", { headers: foreign, data: {} });
  expect(invoiceWrite.status()).toBe(403);
  expect(await invoiceWrite.json()).toEqual({ error: "forbidden", message: "Cross-origin write refused." });

  const qrWrite = await page.request.post("/api/qr", {
    headers: foreign,
    data: { type: "publish", targetUrl: "https://example.com", logo: null },
  });
  expect(qrWrite.status()).toBe(403);
  expect(await qrWrite.json()).toEqual({ ok: false, code: "invalid", reason: "Cross-origin write refused." });

  const policyWrite = await page.request.post("/api/policies", { headers: foreign, data: {} });
  expect(policyWrite.status()).toBe(403);
  expect(await policyWrite.json()).toEqual({ error: "forbidden", message: "Cross-origin write refused." });

  const presetWrite = await page.request.post("/api/data-presets", { headers: foreign, data: {} });
  expect(presetWrite.status()).toBe(403);
  expect(await presetWrite.json()).toEqual({ error: "forbidden", message: "Cross-origin write refused." });

  const script = await page.request.post("/api/qr", {
    headers: { origin },
    data: { type: "publish", targetUrl: "javascript:alert(1)", logo: null },
  });
  expect(script.status()).toBe(400);
  expect(await script.json()).toEqual({
    ok: false,
    code: "invalid",
    reason: "Link must be an http or https URL.",
  });
  const scan = await page.request.get("/q/00000000-0000-4000-8000-000000000000", { maxRedirects: 0 });
  expect(scan.status()).toBe(404);
  expect(scan.headers().location).toBeUndefined();

  await openTool(page, "/invoice-generator");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Client name").fill("Bea");
  await page.getByLabel("Invoice number").fill("300");
  await page.getByLabel("Description").fill("Consulting");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Unit price").fill("10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/^Saved [0-9a-f-]{36}$/);
  const status = await page.getByRole("status").textContent();
  const id = status?.slice("Saved ".length) ?? "";
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  const owned = await page.request.get(`/api/invoices/${id}`);
  expect(owned.status()).toBe(200);

  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await signIn(otherPage, test.info());
    const hidden = await otherPage.request.get(`/api/invoices/${id}`);
    expect(hidden.status()).toBe(404);
    expect(await hidden.json()).toEqual({ error: "not-found", message: "Document not found." });
  } finally {
    await other.close();
  }
});
