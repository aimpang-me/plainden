import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { PLAN_DOWNLOAD_MESSAGE, hostedDocument, type PolicyPlan } from "./catalog";

const FONT_MESSAGE = "This PDF font cannot draw one of the answers. Copy the text instead.";

export type PdfResult =
  | { ok: true; bytes: Uint8Array; filename: string }
  | { ok: false; error: "plan"; message: typeof PLAN_DOWNLOAD_MESSAGE }
  | { ok: false; error: "invalid"; message: string }
  | { ok: false; error: "font"; message: typeof FONT_MESSAGE };

export async function toPdf(raw: unknown, plan: PolicyPlan): Promise<PdfResult> {
  const hosted = hostedDocument(raw);
  if (!hosted.ok) return { ok: false, error: "invalid", message: hosted.message };
  switch (plan) {
    case "free":
      return { ok: false, error: "plan", message: PLAN_DOWNLOAD_MESSAGE };
    case "paid":
      return drawPdf(hosted.kind, hosted.text);
    default: {
      const unreachable: never = plan;
      return unreachable;
    }
  }
}

async function drawPdf(kind: string, text: string): Promise<PdfResult> {
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrap(text, font, 11, 516);
    let page = doc.addPage([612, 792]);
    let y = 740;
    for (const line of lines) {
      if (y < 48) {
        page = doc.addPage([612, 792]);
        y = 740;
      }
      if (line.length > 0) {
        page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
      }
      y -= 16;
    }
    const bytes = await doc.save();
    return { ok: true, bytes, filename: `${kind}-policy.pdf` };
  } catch (error) {
    if (error instanceof Error && error.message.includes("cannot encode")) {
      return { ok: false, error: "font", message: FONT_MESSAGE };
    }
    throw error;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.length === 0) {
      lines.push("");
      continue;
    }
    let rest = rawLine;
    while (rest.length > 0) {
      if (font.widthOfTextAtSize(rest, size) <= maxWidth) {
        lines.push(rest);
        break;
      }
      let cut = rest.length;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
  }
  return lines;
}
