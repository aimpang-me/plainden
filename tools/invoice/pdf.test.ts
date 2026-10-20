import { inflateSync } from "node:zlib";
import { expect, test } from "vitest";
import { FREE_FOOTER, openInvoice, openReceipt, RECEIPT_STAMP } from "./document";
import { exportPdf } from "./pdf";

const now = new Date("2026-10-20T12:00:00.000Z");

function sampleInvoice() {
  return openInvoice(
    {
      from: { name: "Northwind Studio" },
      to: { name: "Harbour Co" },
      number: "CA-1001",
      currency: "USD",
      taxPercent: "0",
      lines: [{ description: "Consulting", quantity: "2", unitPrice: "10.00" }],
    },
    now,
  );
}

function pdfLiterals(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
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

test("a free invoice PDF contains the footer and the total", async () => {
  const result = await exportPdf(sampleInvoice(), "free");
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(Buffer.from(result.bytes).subarray(0, 5).toString("utf8")).toBe("%PDF-");
  const text = pdfLiterals(result.bytes);
  expect(text).toContain(FREE_FOOTER);
  expect(text).toContain("Consulting");
  expect(text).toContain("$20.00");
  expect(result.filename).toBe("Invoice CA-1001.pdf");
});

test("a paid invoice PDF omits the footer", async () => {
  const result = await exportPdf(sampleInvoice(), "paid");
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(pdfLiterals(result.bytes)).not.toContain(FREE_FOOTER);
});

test("a receipt PDF contains the paid stamp", async () => {
  const draft = openReceipt(
    {
      from: { name: "Northwind Studio" },
      to: { name: "Harbour Co" },
      number: "R-9",
      method: "card",
      lines: [{ description: "Rent", quantity: "1", unitPrice: "10.00" }],
    },
    now,
  );
  const result = await exportPdf(draft, "free");
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const text = pdfLiterals(result.bytes);
  expect(text).toContain(RECEIPT_STAMP);
  expect(text).toContain("R-9");
  expect(result.filename).toBe("Receipt R-9.pdf");
});
