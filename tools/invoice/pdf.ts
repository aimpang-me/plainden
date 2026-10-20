import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { view, type Draft, type Plan, type Preview } from "./document";

const pageWidth = 612;
const margin = 48;
const maxWidth = pageWidth - margin * 2;


export function wrapLines(text: string, widthOf: (value: string) => number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      for (const piece of splitWide(word, widthOf, width)) {
        const next = current ? `${current} ${piece}` : piece;
        if (!current || widthOf(next) <= width) {
          current = next;
          continue;
        }
        lines.push(current);
        current = piece;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

export async function exportPdf(
  draft: Draft,
  plan: Plan,
): Promise<{ ok: true; bytes: Uint8Array; filename: string } | { ok: false; issues: Preview["issues"] }> {
  const preview = view(draft, plan);
  if (preview.issues.length > 0) return { ok: false, issues: preview.issues };
  const doc = await PDFDocument.create();
  const faces = await chooseFonts(doc, drawnText(preview));
  let page = doc.addPage([pageWidth, 792]);
  let y = preview.template === "letter" ? 700 : 740;
  const draw = (text: string, size: number, weight: "plain" | "bold" = "plain") => {
    const font = weight === "bold" ? faces.bold : faces.plain;
    const lines = wrapLines(text, (value) => font.widthOfTextAtSize(value, size), maxWidth);
    for (const line of lines) {
      if (y < margin + size) {
        page = doc.addPage([pageWidth, 792]);
        y = 740;
      }
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 8;
    }
  };
  if (preview.template === "ruled") {
    page.drawLine({ start: { x: margin, y: 760 }, end: { x: pageWidth - margin, y: 760 }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
  }
  draw(preview.heading, 22, "bold");
  draw(`${preview.numberLabel} ${preview.number}`, 12);
  draw(preview.from.name, 12, "bold");
  if (preview.from.address) draw(preview.from.address, 10);
  draw(preview.to.name, 12);
  if (preview.to.address) draw(preview.to.address, 10);
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

function drawnText(preview: Preview): string {
  return [
    preview.heading,
    preview.number,
    preview.from.name,
    preview.from.address,
    preview.to.name,
    preview.to.address,
    ...preview.meta.map((row) => `${row.label} ${row.value}`),
    ...preview.lines.map((line) => `${line.description} ${line.quantity} ${line.unitPrice} ${line.amount}`),
    preview.subtotal,
    preview.taxLabel,
    preview.tax,
    preview.total,
    preview.notes,
    preview.stamp ?? "",
    preview.footer ?? "",
  ].join("\n");
}

function needsUnicode(value: string): boolean {
  return /[^\n\r\t\u0020-\u007e]/.test(value);
}

async function chooseFonts(doc: PDFDocument, text: string): Promise<{ plain: PDFFont; bold: PDFFont }> {
  if (!needsUnicode(text)) {
    return {
      plain: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
  }
  const [{ default: fontkit }, fonts] = await Promise.all([import("@pdf-lib/fontkit"), import("./fonts/embedded")]);
  doc.registerFontkit(fontkit);
  return {
    plain: await doc.embedFont(fonts.regularFont, { subset: true }),
    bold: await doc.embedFont(fonts.boldFont, { subset: true }),
  };
}

function splitWide(word: string, widthOf: (value: string) => number, width: number): string[] {
  if (widthOf(word) <= width) return [word];
  const pieces: string[] = [];
  let current = "";
  for (const char of word) {
    const next = `${current}${char}`;
    if (current && widthOf(next) > width) {
      pieces.push(current);
      current = char;
      continue;
    }
    current = next;
  }
  if (current) pieces.push(current);
  return pieces;
}

async function drawLogo(doc: PDFDocument, page: PDFPage, dataUrl: string) {
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
