import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { config } from "./config";
import { copy } from "./copy";
import { imageOps, opOrder, type ImageEncoder, type ImageSource } from "./engine";
import { runImage } from "./run";

const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function monotone(): ImageEncoder {
  return {
    async measure() {
      return { width: 1600, height: 1200 };
    },
    async encode(request) {
      const quality = request.output === "image/png" ? 1 : request.quality;
      const length = Math.max(1, Math.round(204800 * quality * request.scale * request.scale));
      return {
        bytes: new Uint8Array(length),
        width: Math.max(1, Math.round(1600 * request.scale)),
        height: Math.max(1, Math.round(1200 * request.scale)),
      };
    },
  };
}

function source(name: string, size: number, bytes: Uint8Array, reads: { count: number }): ImageSource {
  return {
    name,
    size,
    read: async () => {
      reads.count += 1;
      return bytes;
    },
  };
}

async function runSlug(slug: string, preset: string | undefined, files: readonly ImageSource[], encode: ImageEncoder = monotone()) {
  const view = Object.values(imageOps).find((row) => row.matches(slug));
  if (!view) throw new Error(`missing view for ${slug}`);
  return runImage({ op: view.op, plan: "free", preset, values: {}, files, encode });
}

test("compress targets land inside 10 percent", async () => {
  const hundred = await runSlug("compress-image-to-100kb", "100kb", [
    source("photo.png", 200_000, pngBytes, { count: 0 }),
  ]);
  expect(hundred.ok).toBe(true);
  if (!hundred.ok) return;
  expect(hundred.files[0]?.name).toBe("photo.jpg");
  expect(Math.abs((hundred.files[0]?.bytes.length ?? 0) - 102400) * 10 <= 102400).toBe(true);

  const twoHundred = await runSlug("compress-image-to-200kb", "200kb", [
    source("photo.png", 200_000, pngBytes, { count: 0 }),
  ]);
  expect(twoHundred.ok).toBe(true);
  if (!twoHundred.ok) return;
  expect(twoHundred.files[0]?.name.endsWith(".jpg")).toBe(true);
  expect(Math.abs(twoHundred.files[0].bytes.length - 204800) * 10 <= 204800).toBe(true);

  const twenty = await runSlug("resize-image-to-20kb", "20kb", [source("photo.png", 200_000, pngBytes, { count: 0 })]);
  expect(twenty.ok).toBe(true);
  if (!twenty.ok) return;
  expect(twenty.files[0]?.name.endsWith(".jpg")).toBe(true);
  expect(Math.abs(twenty.files[0].bytes.length - 20480) * 10 <= 20480).toBe(true);
});

test("an oversized file fails before read", async () => {
  const reads = { count: 0 };
  const over = await runSlug("compress-image", undefined, [
    source("big.png", 10 * 1024 * 1024 + 1, pngBytes, reads),
  ]);
  expect(over).toEqual({ ok: false, limit: true, reason: "free fileSize allows 10485760" });
  expect(reads.count).toBe(0);
});

test("eleven files fail the free batch before read", async () => {
  const reads = { count: 0 };
  const files = Array.from({ length: 11 }, (_, index) => source(`tiny-${index}.png`, 10, pngBytes, reads));
  const over = await runSlug("compress-image", undefined, files);
  expect(over).toEqual({ ok: false, limit: true, reason: "free batchCount allows 10" });
  expect(reads.count).toBe(0);
});

test("ten files at the free file cap pass the gate", async () => {
  const reads = { count: 0 };
  const files = Array.from({ length: 10 }, (_, index) => source(`photo-${index}.png`, 10 * 1024 * 1024, pngBytes, reads));
  const result = await runSlug("compress-image", "100kb", files);
  expect(reads.count).toBe(10);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.files).toHaveLength(10);
  expect(result.files[0]?.name).toBe("photo-0.jpg");
});

test("resize-image-to-20kb belongs to compress", () => {
  expect(imageOps.compress.matches("resize-image-to-20kb")).toBe(true);
  expect(imageOps.resize.matches("resize-image-to-20kb")).toBe(false);
  expect(imageOps.resize.matches("resize-image")).toBe(true);
  expect(imageOps.compress.matches("resize-image")).toBe(false);
  const fields = imageOps.compress.fields({ preset: "20kb", values: {} });
  expect(fields[0]).toMatchObject({ name: "target", value: "20" });
});

test("seo pages are the long-tail slugs in op order", () => {
  expect([...config.seoPages]).toEqual(copy.longTail.map((page) => page.slug));
  expect([...config.seoPages]).toEqual([
    "compress-image-to-100kb",
    "compress-image-to-200kb",
    "resize-image-to-20kb",
    "resize-image-by-half",
    "convert-image-to-webp",
  ]);
  expect(opOrder.flatMap((op) => imageOps[op].longTail.map((page) => page.slug))).toEqual([...config.seoPages]);
  expect([...config.slugs]).toEqual([
    "compress-image",
    "resize-image",
    "convert-image",
    "heic-to-jpg",
    "webp-to-png",
  ]);
  expect(config.id).toBe("image");
  expect(config.priceLookupKey).toBe("plainden_image_month");
  expect(config.entitlementKey).toBe("image");
  expect(config.limits).toEqual({
    free: { batchCount: 10, fileSize: 10 * 1024 * 1024 },
    paid: { batchCount: 100, fileSize: 50 * 1024 * 1024 },
  });
  expect(copy.faq.length >= 6).toBe(true);
  expect(copy.longTail.length >= 5).toBe(true);
  for (const page of copy.longTail) {
    expect(page.intro.length > 0).toBe(true);
    expect(page.preset).toBeTruthy();
    expect(page.faq.length >= 1).toBe(true);
  }
});

test("a filled target wins over the preset", async () => {
  const result = await runImage({
    op: "compress",
    plan: "free",
    preset: "100kb",
    values: { target: "20" },
    files: [source("photo.png", 1000, pngBytes, { count: 0 })],
    encode: monotone(),
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(Math.abs(result.files[0].bytes.length - 20480) * 10 <= 20480).toBe(true);
});

test("resize by half keeps the source type", async () => {
  let scale = 0;
  const encode: ImageEncoder = {
    async measure() {
      return { width: 1600, height: 1200 };
    },
    async encode(request) {
      scale = request.scale;
      expect(request.quality).toBe(0.92);
      expect(request.output).toBe("image/png");
      return {
        bytes: new Uint8Array([1]),
        width: Math.max(1, Math.round(1600 * request.scale)),
        height: Math.max(1, Math.round(1200 * request.scale)),
      };
    },
  };
  const result = await runSlug("resize-image-by-half", "50", [source("photo.png", 1000, pngBytes, { count: 0 })], encode);
  expect(scale).toBe(0.5);
  expect(result).toMatchObject({
    ok: true,
    note: "Resized 1 image to 800 by 600 pixels.",
    files: [{ name: "photo.png", mime: "image/png" }],
  });
});

test("both pixel edges use the smaller ratio", async () => {
  let scale = 0;
  const encode: ImageEncoder = {
    async measure() {
      return { width: 1600, height: 1200 };
    },
    async encode(request) {
      scale = request.scale;
      return { bytes: new Uint8Array([1]), width: 1, height: 1 };
    },
  };
  const result = await runImage({
    op: "resize",
    plan: "free",
    values: { mode: "pixels", width: "1600", height: "600" },
    files: [source("photo.png", 1000, pngBytes, { count: 0 })],
    encode,
  });
  expect(result.ok).toBe(true);
  expect(scale).toBe(0.5);
});

test("convert to webp uses one encode", async () => {
  let quality = 0;
  let output = "";
  const encode: ImageEncoder = {
    async measure() {
      return { width: 8, height: 8 };
    },
    async encode(request) {
      quality = request.quality;
      output = request.output;
      expect(request.scale).toBe(1);
      return { bytes: new Uint8Array([1]), width: 8, height: 8 };
    },
  };
  const result = await runSlug("convert-image-to-webp", "webp", [source("photo.png", 1000, pngBytes, { count: 0 })], encode);
  expect(quality).toBe(0.92);
  expect(output).toBe("image/webp");
  expect(result).toMatchObject({
    ok: true,
    note: "Converted 1 image to WebP.",
    files: [{ name: "photo.webp", mime: "image/webp" }],
  });
});

test("a miss returns the closest file and names the sizes", async () => {
  const encode: ImageEncoder = {
    async measure() {
      return { width: 4, height: 4 };
    },
    async encode() {
      return { bytes: new Uint8Array(10), width: 1, height: 1 };
    },
  };
  const result = await runSlug("compress-image-to-100kb", "100kb", [source("photo.png", 1000, pngBytes, { count: 0 })], encode);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.files[0]?.bytes.length).toBe(10);
  expect(result.note).toBe("Closest is 10 bytes, outside 10% of 102400 bytes.");
  expect(result.note.includes("exactly")).toBe(false);
  expect(result.note.includes("guaranteed")).toBe(false);
});

test("empty, bad preset, and sniff failures are not limit errors", async () => {
  const reads = { count: 0 };
  const empty = await runImage({
    op: "compress",
    plan: "free",
    values: {},
    files: [],
    encode: monotone(),
  });
  expect(empty).toEqual({ ok: false, limit: false, reason: "Add an image." });
  const preset = await runImage({
    op: "compress",
    plan: "free",
    preset: "4mb",
    values: {},
    files: [source("photo.png", 10, pngBytes, reads)],
    encode: monotone(),
  });
  expect(preset).toEqual({ ok: false, limit: false, reason: "Choose a target of 20 KB, 100 KB, or 200 KB." });
  expect(reads.count).toBe(0);
  const sniffed = await runSlug("compress-image", undefined, [source("notes.txt", 4, Uint8Array.from([1, 2, 3, 4]), { count: 0 })]);
  expect(sniffed).toEqual({ ok: false, limit: false, reason: "notes.txt is not a JPEG, PNG, or WebP." });
});

test("the HEIC package import stays in heic.ts", () => {
  const dir = import.meta.dirname;
  const em = "\u2014";
  const en = "\u2013";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.endsWith(".test.ts")) continue;
    const text = readFileSync(path.join(dir, entry.name), "utf8");
    expect(text.includes(em) || text.includes(en), entry.name).toBe(false);
    const loadsPackage = text.includes('from "heic-to"') || text.includes('import("heic-to")');
    expect(loadsPackage, entry.name).toBe(entry.name === "heic.ts");
    expect(text.includes("heic2any"), entry.name).toBe(false);
  }
  const toolSource = readFileSync(path.join(dir, "tool.tsx"), "utf8");
  expect(toolSource.startsWith('"use client"')).toBe(true);
  expect(toolSource.includes("decideLimit")).toBe(false);
  expect(toolSource.includes("./heic")).toBe(false);
  const engineSource = readFileSync(path.join(dir, "engine.ts"), "utf8");
  expect(engineSource.includes('import("./heic")')).toBe(true);
  expect(engineSource.includes('from "./heic"')).toBe(false);
  expect(engineSource.includes("decideLimit")).toBe(false);
  const runSource = readFileSync(path.join(dir, "run.ts"), "utf8");
  expect(runSource.includes('from "@/lib/entitlements/decide-limit"')).toBe(true);
});
