import { inflateSync } from "node:zlib";
import { expect, test } from "vitest";
import { FREE_FOOTER, openInvoice, openReceipt, RECEIPT_STAMP } from "./document";
import { exportPdf, wrapLines } from "./pdf";

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

test("long lines wrap and a euro total keeps the euro sign in the font map", async () => {
  expect(wrapLines("alpha beta", (value) => value.length, 5)).toEqual(["alpha", "beta"]);
  const wide = openInvoice(
    {
      from: { name: "Ada", address: "1 Rue de Rivoli" },
      to: { name: "Bea" },
      number: "100",
      lines: [{ description: "Consulting ".repeat(12).trim(), quantity: "1", unitPrice: "10.00" }],
    },
    now,
  );
  const ascii = await exportPdf(wide, "paid");
  expect(ascii.ok).toBe(true);
  if (!ascii.ok) return;
  expect(pdfLiterals(ascii.bytes)).toContain("Consulting");
  expect(pdfLiterals(ascii.bytes)).toContain("1 Rue de Rivoli");
  const euro = await exportPdf(
    openInvoice(
      {
        from: { name: "Ada" },
        to: { name: "Bea" },
        number: "EUR-1",
        currency: "EUR",
        lines: [{ description: "Consulting", quantity: "1", unitPrice: "10.00" }],
      },
      now,
    ),
    "paid",
  );
  expect(euro.ok).toBe(true);
  if (!euro.ok) return;
  expect(inflatedText(euro.bytes).toUpperCase()).toContain("20AC");
});

function inflatedText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  let text = raw;
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const body = Buffer.from(match[1] ?? "", "latin1");
    try {
      text += inflateSync(body).toString("latin1");
    } catch {
      text += body.toString("latin1");
    }
  }
  return text;
}
