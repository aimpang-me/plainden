import { PDFDocument } from "pdf-lib";
import { expect, test, vi } from "vitest";
import { toPdf } from "./pdf";

const answers = {
  businessName: "Northwind Apps",
  contactEmail: "privacy@northwind.example",
  website: "https://northwind.example",
  jurisdiction: "US",
  dataCollected: "account email and crash logs",
  purpose: "to run the app and fix crashes",
  retention: "18 months after the account closes",
};

test("a free plan does not return PDF bytes or save a document", async () => {
  const save = vi.spyOn(PDFDocument.prototype, "save");
  try {
    const result = await toPdf({ kind: "privacy", answers }, "free");
    expect(result).toEqual({
      ok: false,
      error: "plan",
      message: "Markdown and PDF need the legal plan.",
    });
    expect(result).not.toHaveProperty("bytes");
    expect(save).not.toHaveBeenCalled();
  } finally {
    save.mockRestore();
  }
});

test("an invalid draft is not a PDF", async () => {
  const result = await toPdf({ kind: "privacy" }, "paid");
  expect(result).toEqual({ ok: false, error: "invalid", message: "Missing answers." });
  expect(result).not.toHaveProperty("bytes");
});

test("a paid draft draws a Helvetica PDF and a character outside the font fails", async () => {
  const paid = await toPdf({ kind: "privacy", answers }, "paid");
  expect(paid.ok).toBe(true);
  if (!paid.ok) throw new Error("paid pdf missing");
  expect(paid.filename).toBe("privacy-policy.pdf");
  expect(paid.bytes[0]).toBe(0x25);
  expect(paid.bytes[1]).toBe(0x50);
  expect(paid.bytes[2]).toBe(0x44);
  expect(paid.bytes[3]).toBe(0x46);
  const snowman = await toPdf({ kind: "privacy", answers: { ...answers, businessName: "Snowman \u2603" } }, "paid");
  expect(snowman).toEqual({
    ok: false,
    error: "font",
    message: "This PDF font cannot draw one of the answers. Copy the text instead.",
  });
});
