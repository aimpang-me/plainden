import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "vitest";
import { copy } from "./copy";
import { config } from "./config";
import { fileKind, opForSlug, parsePageSpans, readJpegPayloads, runPdf } from "./engine";

const jpeg = new Uint8Array(readFileSync(path.join(import.meta.dirname, "fixtures/pixel.jpg")));
const skipEncode = async () => null;

async function blankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([30, 40]);
  return doc.save();
}

test("slug routes and file kinds", () => {
  const routes = {
    "merge-pdf": "merge",
    "split-pdf": "split",
    "compress-pdf": "compress",
    "jpg-to-pdf": "jpg",
    "compress-pdf-to-4mb": "compress",
    "merge-pdf-files": "merge",
    "split-pdf-pages": "split",
    "jpg-to-pdf-photos": "jpg",
    "compress-pdf-scans": "compress",
  };
  expect(opForSlug("not-a-tool")).toBeNull();
  expect([...config.slugs, ...copy.longTail.map((page) => page.slug)].sort()).toEqual(Object.keys(routes).sort());
  expect(config.seoPages).toEqual(copy.longTail.map((page) => page.slug));
  for (const [slug, op] of Object.entries(routes)) expect(opForSlug(slug)).toBe(op);
  expect(fileKind(jpeg)).toBe("jpg");
  expect(fileKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("pdf");
  expect(fileKind(new Uint8Array([1, 2, 3]))).toBe("other");
});

test("parse page spans", () => {
  expect(parsePageSpans("", 3)).toEqual({
    ok: true,
    spans: [
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 3 },
    ],
  });
  expect(parsePageSpans("1-2,4", 4)).toEqual({
    ok: true,
    spans: [
      { start: 1, end: 2 },
      { start: 4, end: 4 },
    ],
  });
  expect(parsePageSpans("0", 3)).toEqual({ ok: false, reason: "Page range 0 is outside 1 to 3." });
  expect(parsePageSpans("2-1", 3)).toEqual({ ok: false, reason: "Page range 2-1 is outside 1 to 3." });
  expect(parsePageSpans("abc", 3)).toEqual({ ok: false, reason: "Page range abc is not a page or a range." });
});

test("merge, split, and jpg round trip sample bytes", async () => {
  const left = await blankPdf();
  const photo = await runPdf({
    op: "jpg",
    files: [{ name: "pixel.jpg", bytes: jpeg }],
    rangeText: "",
    encodeJpeg: skipEncode,
  });
  expect(photo).toMatchObject({ ok: true, note: "Made a PDF with 1 page." });
  if (!photo.ok) return;
  const merged = await runPdf({
    op: "merge",
    files: [
      { name: "left.pdf", bytes: left },
      { name: "photo.pdf", bytes: photo.files[0].bytes },
    ],
    rangeText: "",
    encodeJpeg: skipEncode,
  });
  expect(merged).toMatchObject({ ok: true, note: "Merged 2 files into 2 pages." });
  if (!merged.ok) return;
  const reloaded = await PDFDocument.load(merged.files[0].bytes);
  expect(reloaded.getPageCount()).toBe(2);
  const split = await runPdf({
    op: "split",
    files: [{ name: "merged.pdf", bytes: merged.files[0].bytes }],
    rangeText: "1,2",
    encodeJpeg: skipEncode,
  });
  expect(split).toMatchObject({ ok: true, note: "Split into 2 PDFs." });
  if (!split.ok) return;
  expect(split.files.map((file) => file.name)).toEqual(["page-1.pdf", "page-2.pdf"]);
  const first = await PDFDocument.load(split.files[0].bytes);
  const second = await PDFDocument.load(split.files[1].bytes);
  expect(first.getPageCount()).toBe(1);
  expect(second.getPageCount()).toBe(1);
});

test("compress rewrites a shorter jpeg and leaves a blank page in place", async () => {
  const photo = await runPdf({
    op: "jpg",
    files: [{ name: "pixel.jpg", bytes: jpeg }],
    rangeText: "",
    encodeJpeg: skipEncode,
  });
  if (!photo.ok) throw new Error(photo.reason);
  const blank = await blankPdf();
  const merged = await runPdf({
    op: "merge",
    files: [
      { name: "blank.pdf", bytes: blank },
      { name: "photo.pdf", bytes: photo.files[0].bytes },
    ],
    rangeText: "",
    encodeJpeg: skipEncode,
  });
  if (!merged.ok) throw new Error(merged.reason);
  const before = await readJpegPayloads(merged.files[0].bytes);
  expect(before).toHaveLength(1);
  const stub = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const compressed = await runPdf({
    op: "compress",
    files: [{ name: "merged.pdf", bytes: merged.files[0].bytes }],
    rangeText: "",
    encodeJpeg: async () => stub,
  });
  expect(compressed).toMatchObject({ ok: true, note: "Checked 1 JPEG image. Encoded 1. Recompressed 1." });
  if (!compressed.ok) return;
  expect(await readJpegPayloads(compressed.files[0].bytes)).toEqual([stub]);
  const pages = await PDFDocument.load(compressed.files[0].bytes);
  expect(pages.getPageCount()).toBe(2);
  const kept = await runPdf({
    op: "compress",
    files: [{ name: "merged.pdf", bytes: merged.files[0].bytes }],
    rangeText: "",
    encodeJpeg: async () => new Uint8Array(before[0].length + 8),
  });
  expect(kept).toMatchObject({ ok: true, note: "Checked 1 JPEG image. Encoded 1. Recompressed 0." });
  if (!kept.ok) return;
  expect(await readJpegPayloads(kept.files[0].bytes)).toEqual(before);
  const skipped = await runPdf({
    op: "compress",
    files: [{ name: "merged.pdf", bytes: merged.files[0].bytes }],
    rangeText: "",
    encodeJpeg: async () => null,
  });
  expect(skipped).toMatchObject({ ok: true, note: "Checked 1 JPEG image. Encoded 0. Recompressed 0." });
});
