import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { view, type Draft, type Plan, type Preview } from "./document";

export async function exportPdf(
  draft: Draft,
  plan: Plan,
): Promise<{ ok: true; bytes: Uint8Array; filename: string } | { ok: false; issues: Preview["issues"] }> {
  const preview = view(draft, plan);
  if (preview.issues.length > 0) return { ok: false, issues: preview.issues };
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = preview.template === "letter" ? 700 : 740;
  const draw = (text: string, size: number, weight: "plain" | "bold" = "plain") => {
    page.drawText(printable(text), { x: 48, y, size, font: weight === "bold" ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 8;
  };
  if (preview.template === "ruled") {
    page.drawLine({ start: { x: 48, y: 760 }, end: { x: 564, y: 760 }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
  }
  draw(preview.heading, 22, "bold");
  draw(`${preview.numberLabel} ${preview.number}`, 12);
  draw(preview.from.name, 12, "bold");
  if (preview.from.address) draw(preview.from.address, 10);
  draw(preview.to.name, 12);
  for (const row of preview.meta) draw(`${row.label} ${row.value}`, 11);
  for (const line of preview.lines) {
    draw(`${line.description}  ${line.quantity} x ${line.unitPrice}  ${line.amount}`, 11);
  }
  draw(`Subtotal ${preview.subtotal}`, 12);
  draw(`${preview.taxLabel} ${preview.tax}`, 12);
  draw(`Total ${preview.total}`, 14, "bold");
  if (preview.notes) draw(preview.notes, 10);
  if (preview.stamp) draw(preview.stamp, 18, "bold");
  if (preview.footer) draw(preview.footer, 9);
  if (preview.logo) await drawLogo(doc, page, preview.logo.dataUrl);
  const bytes = await doc.save();
  const cleaned = preview.number.replace(/[^A-Za-z0-9 -]/g, "").trim() || "document";
  return { ok: true, bytes, filename: `${preview.heading} ${cleaned}.pdf` };
}

async function drawLogo(doc: PDFDocument, page: ReturnType<PDFDocument["addPage"]>, dataUrl: string) {
  const bytes = dataUrlToBytes(dataUrl);
  const image = dataUrl.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  page.drawImage(image, { x: 460, y: 730, width: 80, height: 40 });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? "" : dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function printable(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ");
}
