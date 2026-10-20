import { PDFArray, PDFDocument, PDFName, PDFRawStream, type PDFRef } from "pdf-lib";

export type PdfOp = "merge" | "split" | "compress" | "jpg";

export type PdfBytes = { name: string; bytes: Uint8Array };

export type PdfRun =
  | { ok: true; files: PdfBytes[]; note: string }
  | { ok: false; reason: string };

export type PageSpan = { start: number; end: number };

export type SpanParse = { ok: true; spans: readonly PageSpan[] } | { ok: false; reason: string };

export type JpegEncoder = (jpeg: Uint8Array) => Promise<Uint8Array | null>;

const dct = PDFName.of("DCTDecode");
const imageSubtype = PDFName.of("Image");

export function opForSlug(slug: string): PdfOp | null {
  if (slug.startsWith("merge-pdf")) return "merge";
  if (slug.startsWith("split-pdf")) return "split";
  if (slug.startsWith("compress-pdf")) return "compress";
  if (slug.startsWith("jpg-to-pdf")) return "jpg";
  return null;
}

export function fileKind(bytes: Uint8Array): "pdf" | "jpg" | "other" {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return "other";
}

export function parsePageSpans(text: string, pageCount: number): SpanParse {
  const trimmed = text.trim();
  if (trimmed === "") {
    return {
      ok: true,
      spans: Array.from({ length: pageCount }, (_, index) => ({ start: index + 1, end: index + 1 })),
    };
  }
  const spans: PageSpan[] = [];
  for (const part of trimmed.split(",")) {
    const piece = part.trim();
    const match = /^(\d+)(?:-(\d+))?$/.exec(piece);
    if (!match || !match[1]) return { ok: false, reason: `Page range ${piece} is not a page or a range.` };
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start || end > pageCount) {
      return { ok: false, reason: `Page range ${piece} is outside 1 to ${pageCount}.` };
    }
    spans.push({ start, end });
  }
  if (spans.length === 0) return { ok: false, reason: "Enter a page range." };
  return { ok: true, spans };
}

export async function readJpegPayloads(bytes: Uint8Array): Promise<Uint8Array[]> {
  const pdf = await PDFDocument.load(bytes);
  return jpegStreams(pdf).map((entry) => entry.stream.contents.slice());
}

export async function runPdf(input: {
  op: PdfOp;
  files: readonly PdfBytes[];
  rangeText: string;
  encodeJpeg: JpegEncoder;
}): Promise<PdfRun> {
  switch (input.op) {
    case "merge":
      return mergeFiles(input.files);
    case "split":
      return splitFile(input.files, input.rangeText);
    case "compress":
      return compressFile(input.files, input.encodeJpeg);
    case "jpg":
      return jpgFiles(input.files);
    default: {
      const unreachable: never = input.op;
      return unreachable;
    }
  }
}

async function mergeFiles(files: readonly PdfBytes[]): Promise<PdfRun> {
  if (files.length < 2) return { ok: false, reason: "Add at least two PDFs to merge." };
  for (const file of files) {
    if (fileKind(file.bytes) !== "pdf") return { ok: false, reason: `${file.name} is not a PDF.` };
  }
  try {
    const out = await PDFDocument.create();
    for (const file of files) {
      const doc = await PDFDocument.load(file.bytes);
      const copied = await out.copyPages(doc, doc.getPageIndices());
      for (const page of copied) out.addPage(page);
    }
    const bytes = await out.save();
    return {
      ok: true,
      files: [{ name: "merged.pdf", bytes }],
      note: `Merged ${files.length} files into ${out.getPageCount()} pages.`,
    };
  } catch {
    return { ok: false, reason: "This PDF could not be read." };
  }
}

async function splitFile(files: readonly PdfBytes[], rangeText: string): Promise<PdfRun> {
  const file = files[0];
  if (files.length !== 1 || !file) return { ok: false, reason: "Add one PDF to split." };
  if (fileKind(file.bytes) !== "pdf") return { ok: false, reason: `${file.name} is not a PDF.` };
  try {
    const doc = await PDFDocument.load(file.bytes);
    const parsed = parsePageSpans(rangeText, doc.getPageCount());
    if (!parsed.ok) return parsed;
    if (parsed.spans.length === 0) return { ok: false, reason: "That PDF has no pages." };
    const outputs: PdfBytes[] = [];
    for (const span of parsed.spans) {
      const piece = await PDFDocument.create();
      const indices: number[] = [];
      for (let page = span.start; page <= span.end; page += 1) indices.push(page - 1);
      const copied = await piece.copyPages(doc, indices);
      for (const page of copied) piece.addPage(page);
      outputs.push({ name: spanName(span), bytes: await piece.save() });
    }
    const label = outputs.length === 1 ? "1 PDF" : `${outputs.length} PDFs`;
    return { ok: true, files: outputs, note: `Split into ${label}.` };
  } catch {
    return { ok: false, reason: "This PDF could not be read." };
  }
}

async function compressFile(files: readonly PdfBytes[], encodeJpeg: JpegEncoder): Promise<PdfRun> {
  const file = files[0];
  if (files.length !== 1 || !file) return { ok: false, reason: "Add one PDF to compress." };
  if (fileKind(file.bytes) !== "pdf") return { ok: false, reason: `${file.name} is not a PDF.` };
  try {
    const pdf = await PDFDocument.load(file.bytes);
    const images = jpegStreams(pdf);
    let encoded = 0;
    let recompressed = 0;
    for (const image of images) {
      const next = await encodeJpeg(image.stream.contents.slice());
      if (!next) continue;
      encoded += 1;
      if (next.length >= image.stream.contents.length) continue;
      pdf.context.assign(image.ref, PDFRawStream.of(image.stream.dict, next));
      recompressed += 1;
    }
    const bytes = await pdf.save();
    const checked = images.length === 1 ? "1 JPEG image" : `${images.length} JPEG images`;
    return {
      ok: true,
      files: [{ name: "compressed.pdf", bytes }],
      note: `Checked ${checked}. Encoded ${encoded}. Recompressed ${recompressed}.`,
    };
  } catch {
    return { ok: false, reason: "This PDF could not be read." };
  }
}

async function jpgFiles(files: readonly PdfBytes[]): Promise<PdfRun> {
  if (files.length === 0) return { ok: false, reason: "Add a JPG." };
  for (const file of files) {
    if (fileKind(file.bytes) !== "jpg") return { ok: false, reason: `${file.name} is not a JPG.` };
  }
  try {
    const out = await PDFDocument.create();
    for (const file of files) {
      const image = await out.embedJpg(file.bytes);
      const page = out.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    const bytes = await out.save();
    const label = out.getPageCount() === 1 ? "1 page" : `${out.getPageCount()} pages`;
    return { ok: true, files: [{ name: "images.pdf", bytes }], note: `Made a PDF with ${label}.` };
  } catch {
    return { ok: false, reason: "This JPG could not be read." };
  }
}

function spanName(span: PageSpan): string {
  if (span.start === span.end) return `page-${span.start}.pdf`;
  return `pages-${span.start}-${span.end}.pdf`;
}

function jpegStreams(pdf: PDFDocument): { ref: PDFRef; stream: PDFRawStream }[] {
  const found: { ref: PDFRef; stream: PDFRawStream }[] = [];
  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (obj.dict.lookup(PDFName.of("Subtype")) !== imageSubtype) continue;
    const filter = obj.dict.lookup(PDFName.of("Filter"));
    const single = filter === dct;
    const onlyDct = filter instanceof PDFArray && filter.size() === 1 && filter.lookup(0) === dct;
    if (!single && !onlyDct) continue;
    found.push({ ref, stream: obj });
  }
  return found;
}
