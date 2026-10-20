import { PDFDocument } from "pdf-lib";
import { expect, test } from "vitest";

test("pdf-lib writes a one page document", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  const bytes = await doc.save();
  expect(Buffer.from(bytes).subarray(0, 5).toString("utf8")).toBe("%PDF-");
  expect(doc.getPageCount()).toBe(1);
});
