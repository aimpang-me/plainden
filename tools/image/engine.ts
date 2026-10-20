import type { LongTailPage } from "../../lib/contract/types";

export type ImageOp = "compress" | "resize" | "convert" | "heic" | "webp";

export const opOrder = ["compress", "resize", "convert", "heic", "webp"] as const satisfies readonly ImageOp[];

type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const opsCovered: AssertSame<(typeof opOrder)[number], ImageOp> = true;
void opsCovered;

export type OutputMime = "image/jpeg" | "image/png" | "image/webp";

export type ImageField =
  | { kind: "select"; name: string; label: string; value: string; options: readonly { value: string; label: string }[] }
  | { kind: "number"; name: string; label: string; value: string; min: number; max: number };

export type FieldState = {
  preset?: string;
  values: Readonly<Record<string, string>>;
};

export type ImageOpView = {
  op: ImageOp;
  primarySlug: string;
  title: string;
  button: string;
  accept: string;
  multiple: boolean;
  longTail: readonly LongTailPage[];
  matches(slug: string): boolean;
  fields(state: FieldState): readonly ImageField[];
};

export type ImageSource = {
  name: string;
  size: number;
  read(): Promise<Uint8Array>;
};

export type EncodeRequest = {
  bytes: Uint8Array;
  output: OutputMime;
  quality: number;
  scale: number;
};

export type ImageEncoder = {
  measure(bytes: Uint8Array): Promise<{ width: number; height: number } | null>;
  encode(request: EncodeRequest): Promise<{ bytes: Uint8Array; width: number; height: number } | null>;
};

export type ImageFileOut = { name: string; bytes: Uint8Array; mime: OutputMime };

export type ImageRun =
  | { ok: true; files: readonly ImageFileOut[]; note: string }
  | { ok: false; reason: string; limit: boolean };

export type RunImageInput = {
  op: ImageOp;
  plan: "free" | "paid";
  preset?: string;
  values: Readonly<Record<string, string>>;
  files: readonly ImageSource[];
  encode: ImageEncoder;
};

type PixelSettings =
  | { op: "resize"; mode: "pixels"; width: number; height: number | null }
  | { op: "resize"; mode: "pixels"; width: null; height: number };

type ImageSettings =
  | { op: "compress"; targetKb: 20 | 100 | 200 }
  | PixelSettings
  | { op: "resize"; mode: "percent"; amount: number }
  | { op: "convert"; output: OutputMime }
  | { op: "heic" }
  | { op: "webp" };

type Interpreted =
  | { ok: true; settings: ImageSettings; fields: readonly ImageField[] }
  | { ok: false; reason: string; fields: readonly ImageField[] };

type LoadedFile = { name: string; bytes: Uint8Array };

type Row = {
  op: ImageOp;
  primarySlug: string;
  title: string;
  button: string;
  accept: string;
  multiple: true;
  longTail: readonly LongTailPage[];
  matches(slug: string): boolean;
  fields(state: FieldState): readonly ImageField[];
  interpret(state: FieldState): Interpreted;
  transform(files: readonly LoadedFile[], settings: ImageSettings, encode: ImageEncoder): Promise<ImageRun>;
};

const rasterAccept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const heicAccept = "image/heic,image/heif,.heic,.heif";
const webpAccept = "image/webp,.webp";

const mb = 1024 * 1024;

export const imageLimits = {
  free: { batchCount: 10, fileSize: 10 * mb },
  paid: { batchCount: 100, fileSize: 50 * mb },
};

const claimed = new Set<string>();

function claim(slug: string): void {
  if (claimed.has(slug)) throw new Error(`duplicate image slug ${slug}`);
  claimed.add(slug);
}

function defineRow(row: Omit<Row, "multiple" | "matches" | "fields">): Row {
  const slugs = [row.primarySlug, ...row.longTail.map((page) => page.slug)];
  for (const slug of slugs) claim(slug);
  return {
    ...row,
    multiple: true,
    matches(slug) {
      return slugs.includes(slug);
    },
    fields(state) {
      return row.interpret(state).fields;
    },
  };
}

function publish(row: Row): ImageOpView {
  return {
    op: row.op,
    primarySlug: row.primarySlug,
    title: row.title,
    button: row.button,
    accept: row.accept,
    multiple: row.multiple,
    longTail: row.longTail,
    matches: (slug) => row.matches(slug),
    fields: (state) => row.fields(state),
  };
}

function entered(values: Readonly<Record<string, string>>, name: string): string | null {
  const value = values[name];
  if (value === undefined || value === "") return null;
  return value;
}

function activePreset(preset: string | undefined): string | undefined {
  if (preset === undefined || preset === "") return undefined;
  return preset;
}

function withinTenPercent(size: number, target: number): boolean {
  return Math.abs(size - target) * 10 <= target;
}

function hasBytes(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (bytes.length < offset + expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

function sniffRaster(bytes: Uint8Array): OutputMime | null {
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

function fileName(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.${ext}`;
}

function mimeFile(mime: OutputMime): { ext: "jpg" | "png" | "webp"; label: "JPG" | "PNG" | "WebP" } {
  switch (mime) {
    case "image/jpeg":
      return { ext: "jpg", label: "JPG" };
    case "image/png":
      return { ext: "png", label: "PNG" };
    case "image/webp":
      return { ext: "webp", label: "WebP" };
    default: {
      const unreachable: never = mime;
      return unreachable;
    }
  }
}

function countNoun(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function wrongOperation(): ImageRun {
  return { ok: false, reason: "Wrong operation.", limit: false };
}

function notRaster(name: string): ImageRun {
  return { ok: false, reason: `${name} is not a JPEG, PNG, or WebP.`, limit: false };
}

function encodeFailed(name: string): ImageRun {
  return { ok: false, reason: `${name} could not be encoded.`, limit: false };
}

const targetChoices = [
  { kb: 20, preset: "20kb", value: "20", label: "20 KB" },
  { kb: 100, preset: "100kb", value: "100", label: "100 KB" },
  { kb: 200, preset: "200kb", value: "200", label: "200 KB" },
] as const;

const targetOptions = targetChoices.map((choice) => ({ value: choice.value, label: choice.label }));
const targetReason = "Choose a target of 20 KB, 100 KB, or 200 KB.";

function targetKb(value: string): 20 | 100 | 200 | null {
  if (value === "20") return 20;
  if (value === "100") return 100;
  if (value === "200") return 200;
  return null;
}

function compressInterpret(state: FieldState): Interpreted {
  const preset = activePreset(state.preset);
  const presetChoice = targetChoices.find((choice) => choice.preset === preset);
  const value = entered(state.values, "target") ?? presetChoice?.value ?? (preset ? "" : "100");
  const fields: readonly ImageField[] = [{ kind: "select", name: "target", label: "Target", value, options: targetOptions }];
  const kb = targetKb(value);
  if (kb === null) return { ok: false, reason: targetReason, fields };
  return { ok: true, settings: { op: "compress", targetKb: kb }, fields };
}

const resizeModeOptions = [
  { value: "pixels", label: "Pixels" },
  { value: "percent", label: "Percent" },
];

function wholeNumber(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (value < min || value > max) return null;
  return value;
}

function optionalPixel(text: string): { ok: true; value: number | null } | { ok: false } {
  if (text === "") return { ok: true, value: null };
  const value = wholeNumber(text, 1, 8000);
  if (value === null) return { ok: false };
  return { ok: true, value };
}

function pixelSettings(width: number | null, height: number | null): PixelSettings | null {
  if (width !== null) return { op: "resize", mode: "pixels", width, height };
  if (height !== null) return { op: "resize", mode: "pixels", width: null, height };
  return null;
}

function resizeInterpret(state: FieldState): Interpreted {
  const preset = activePreset(state.preset);
  const modeValue = entered(state.values, "mode") ?? (preset === "50" ? "percent" : "pixels");
  const modeField: ImageField = {
    kind: "select",
    name: "mode",
    label: "Resize by",
    value: modeValue,
    options: resizeModeOptions,
  };
  if (modeValue !== "pixels" && modeValue !== "percent") {
    return { ok: false, reason: "Choose pixels or percent.", fields: [modeField] };
  }
  if (modeValue === "percent") {
    const amountText = entered(state.values, "amount") ?? (preset === "50" ? "50" : "");
    const fields: readonly ImageField[] = [
      modeField,
      { kind: "number", name: "amount", label: "Percent", value: amountText, min: 1, max: 400 },
    ];
    const amount = wholeNumber(amountText, 1, 400);
    if (amount === null) return { ok: false, reason: "Enter a percent from 1 to 400.", fields };
    return { ok: true, settings: { op: "resize", mode: "percent", amount }, fields };
  }
  const widthText = entered(state.values, "width") ?? "";
  const heightText = entered(state.values, "height") ?? "";
  const fields: readonly ImageField[] = [
    modeField,
    { kind: "number", name: "width", label: "Width", value: widthText, min: 1, max: 8000 },
    { kind: "number", name: "height", label: "Height", value: heightText, min: 1, max: 8000 },
  ];
  const width = optionalPixel(widthText);
  const height = optionalPixel(heightText);
  if (!width.ok || !height.ok) return { ok: false, reason: "Enter a width or height from 1 to 8000 pixels.", fields };
  const settings = pixelSettings(width.value, height.value);
  if (!settings) return { ok: false, reason: "Enter a width, a height, or both.", fields };
  return { ok: true, settings, fields };
}

const formatOptions = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
];

function outputFor(value: string): OutputMime | null {
  if (value === "jpg") return "image/jpeg";
  if (value === "png") return "image/png";
  if (value === "webp") return "image/webp";
  return null;
}

function convertInterpret(state: FieldState): Interpreted {
  const preset = activePreset(state.preset);
  const value = entered(state.values, "format") ?? (preset === "webp" ? "webp" : preset ? "" : "jpg");
  const fields: readonly ImageField[] = [{ kind: "select", name: "format", label: "Format", value, options: formatOptions }];
  const output = outputFor(value);
  if (!output) return { ok: false, reason: "Choose JPG, PNG, or WebP.", fields };
  return { ok: true, settings: { op: "convert", output }, fields };
}

function idleInterpret(op: "heic" | "webp"): Interpreted {
  return { ok: true, settings: { op }, fields: [] };
}

async function searchTarget(
  bytes: Uint8Array,
  target: number,
  encode: ImageEncoder,
): Promise<{ bytes: Uint8Array; hit: boolean } | null> {
  let scale = 1;
  let closest: { bytes: Uint8Array; size: number } | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let low = 0.05;
    let high = 0.92;
    let lowSize = 0;
    let highSize = 0;
    for (let probe = 0; probe < 8; probe += 1) {
      const quality = probe === 0 ? high : probe === 1 ? low : (low + high) / 2;
      const encoded = await encode.encode({ bytes, output: "image/jpeg", quality, scale });
      if (!encoded) return null;
      const size = encoded.bytes.length;
      if (closest === null || Math.abs(size - target) < Math.abs(closest.size - target)) {
        closest = { bytes: encoded.bytes, size };
      }
      if (withinTenPercent(size, target)) return { bytes: encoded.bytes, hit: true };
      if (probe === 0) highSize = size;
      else if (probe === 1) lowSize = size;
      else if (size > target) high = quality;
      else low = quality;
    }
    const highUnder = highSize < target && !withinTenPercent(highSize, target);
    const lowOver = lowSize > target && !withinTenPercent(lowSize, target);
    if (highUnder || !lowOver) break;
    const next = scale * 0.85;
    if (next < 0.1) break;
    scale = next;
  }
  if (!closest) return null;
  return { bytes: closest.bytes, hit: false };
}

function resizeScale(settings: Extract<ImageSettings, { op: "resize" }>, measured: { width: number; height: number }): number {
  if (settings.mode === "percent") return settings.amount / 100;
  if (settings.width !== null && settings.height !== null) {
    return Math.min(settings.width / measured.width, settings.height / measured.height);
  }
  if (settings.width !== null) return settings.width / measured.width;
  return settings.height / measured.height;
}

const compressLongTail: readonly LongTailPage[] = [
  {
    slug: "compress-image-to-100kb",
    title: "Compress an image toward 100 KB",
    intro:
      "This page compresses toward 100 KB, which is 102400 bytes. It aims within 10% of that target and does not promise an exact byte count.",
    preset: "100kb",
    faq: [
      {
        question: "Will the file be 100 KB?",
        answer: "The tool aims within 10% of 102400 bytes and does not promise an exact byte count.",
      },
    ],
  },
  {
    slug: "compress-image-to-200kb",
    title: "Compress an image toward 200 KB",
    intro:
      "This page compresses toward 200 KB, which is 204800 bytes. It aims within 10% of that target and does not promise an exact byte count.",
    preset: "200kb",
    faq: [
      {
        question: "Will the file be 200 KB?",
        answer: "The tool aims within 10% of 204800 bytes and does not promise an exact byte count.",
      },
    ],
  },
  {
    slug: "resize-image-to-20kb",
    title: "Compress an image toward 20 KB",
    intro:
      "This page compresses toward 20 KB, which is 20480 bytes. It is a file size target, not a pixel resize. It aims within 10% of that target and does not promise an exact byte count.",
    preset: "20kb",
    faq: [
      {
        question: "Does this page resize by pixels?",
        answer: "No. It compresses toward 20480 bytes and aims within 10%. It does not promise an exact byte count.",
      },
    ],
  },
];

const table = {
  compress: defineRow({
    op: "compress",
    primarySlug: "compress-image",
    title: "Compress",
    button: "Compress images",
    accept: rasterAccept,
    longTail: compressLongTail,
    interpret: compressInterpret,
    async transform(files, settings, encode) {
      if (settings.op !== "compress") return wrongOperation();
      const target = settings.targetKb * 1024;
      const produced: ImageFileOut[] = [];
      const misses: string[] = [];
      for (const file of files) {
        if (!sniffRaster(file.bytes)) return notRaster(file.name);
        const found = await searchTarget(file.bytes, target, encode);
        if (!found) return encodeFailed(file.name);
        produced.push({ name: fileName(file.name, "jpg"), bytes: found.bytes, mime: "image/jpeg" });
        if (!found.hit) misses.push(`Closest is ${found.bytes.length} bytes, outside 10% of ${target} bytes.`);
      }
      if (misses.length > 0) return { ok: true, files: produced, note: misses.join(" ") };
      const noun = countNoun(produced.length, "image", "images");
      return { ok: true, files: produced, note: `Compressed ${produced.length} ${noun} to within 10% of ${target} bytes.` };
    },
  }),
  resize: defineRow({
    op: "resize",
    primarySlug: "resize-image",
    title: "Resize",
    button: "Resize images",
    accept: rasterAccept,
    longTail: [
      {
        slug: "resize-image-by-half",
        title: "Resize an image by half",
        intro: "This page sets the size to 50 percent of the width and height. One encode keeps the JPEG, PNG, or WebP type.",
        preset: "50",
        faq: [
          {
            question: "What does 50 percent change?",
            answer: "Width and height each become half, so the pixel count becomes a quarter.",
          },
        ],
      },
    ],
    interpret: resizeInterpret,
    async transform(files, settings, encode) {
      if (settings.op !== "resize") return wrongOperation();
      const produced: (ImageFileOut & { width: number; height: number })[] = [];
      for (const file of files) {
        const mime = sniffRaster(file.bytes);
        if (!mime) return notRaster(file.name);
        const measured = await encode.measure(file.bytes);
        if (!measured || measured.width < 1 || measured.height < 1) {
          return { ok: false, reason: `${file.name} could not be measured.`, limit: false };
        }
        const scale = resizeScale(settings, measured);
        const encoded = await encode.encode({ bytes: file.bytes, output: mime, quality: 0.92, scale });
        if (!encoded) return encodeFailed(file.name);
        const named = mimeFile(mime);
        produced.push({
          name: fileName(file.name, named.ext),
          bytes: encoded.bytes,
          mime,
          width: encoded.width,
          height: encoded.height,
        });
      }
      const first = produced[0];
      if (!first) return { ok: false, reason: "Add an image.", limit: false };
      const same = produced.every((file) => file.width === first.width && file.height === first.height);
      const note = same
        ? `Resized ${produced.length} ${countNoun(produced.length, "image", "images")} to ${first.width} by ${first.height} pixels.`
        : produced.map((file) => `Resized 1 image to ${file.width} by ${file.height} pixels.`).join(" ");
      return { ok: true, files: produced.map(({ name, bytes, mime }) => ({ name, bytes, mime })), note };
    },
  }),
  convert: defineRow({
    op: "convert",
    primarySlug: "convert-image",
    title: "Convert",
    button: "Convert images",
    accept: rasterAccept,
    longTail: [
      {
        slug: "convert-image-to-webp",
        title: "Convert an image to WebP",
        intro: "This page writes a WebP file from a JPEG, PNG, or WebP image.",
        preset: "webp",
        faq: [
          {
            question: "Does convert aim for a byte count?",
            answer:
              "No. Convert keeps one encode at a fixed quality. Compress is the page that aims within 10% and does not promise an exact byte count.",
          },
        ],
      },
    ],
    interpret: convertInterpret,
    async transform(files, settings, encode) {
      if (settings.op !== "convert") return wrongOperation();
      const named = mimeFile(settings.output);
      const produced: ImageFileOut[] = [];
      for (const file of files) {
        if (!sniffRaster(file.bytes)) return notRaster(file.name);
        const encoded = await encode.encode({ bytes: file.bytes, output: settings.output, quality: 0.92, scale: 1 });
        if (!encoded) return encodeFailed(file.name);
        produced.push({ name: fileName(file.name, named.ext), bytes: encoded.bytes, mime: settings.output });
      }
      const noun = countNoun(produced.length, "image", "images");
      return { ok: true, files: produced, note: `Converted ${produced.length} ${noun} to ${named.label}.` };
    },
  }),
  heic: defineRow({
    op: "heic",
    primarySlug: "heic-to-jpg",
    title: "HEIC to JPG",
    button: "Convert HEIC to JPG",
    accept: heicAccept,
    longTail: [],
    interpret: () => idleInterpret("heic"),
    async transform(files, settings) {
      if (settings.op !== "heic") return wrongOperation();
      const loaded = await import("./heic");
      return loaded.heicTransform(files);
    },
  }),
  webp: defineRow({
    op: "webp",
    primarySlug: "webp-to-png",
    title: "WebP to PNG",
    button: "Convert WebP to PNG",
    accept: webpAccept,
    longTail: [],
    interpret: () => idleInterpret("webp"),
    async transform(files, settings, encode) {
      if (settings.op !== "webp") return wrongOperation();
      const produced: ImageFileOut[] = [];
      for (const file of files) {
        if (sniffRaster(file.bytes) !== "image/webp") {
          return { ok: false, reason: `${file.name} is not a WebP image.`, limit: false };
        }
        const encoded = await encode.encode({ bytes: file.bytes, output: "image/png", quality: 0.92, scale: 1 });
        if (!encoded) return encodeFailed(file.name);
        produced.push({ name: fileName(file.name, "png"), bytes: encoded.bytes, mime: "image/png" });
      }
      const noun = countNoun(produced.length, "WebP image", "WebP images");
      return { ok: true, files: produced, note: `Converted ${produced.length} ${noun} to PNG.` };
    },
  }),
} satisfies Record<ImageOp, Row>;

export const imageOps: Readonly<Record<ImageOp, ImageOpView>> = {
  compress: publish(table.compress),
  resize: publish(table.resize),
  convert: publish(table.convert),
  heic: publish(table.heic),
  webp: publish(table.webp),
};

export function beginImage(
  input: Pick<RunImageInput, "op" | "preset" | "values"> & { fileCount: number },
):
  | { ok: false; reason: string; limit: false }
  | { ok: true; transform: Row["transform"]; settings: ImageSettings } {
  const row = table[input.op];
  const interpreted = row.interpret({ preset: input.preset, values: input.values });
  if (!interpreted.ok) return { ok: false, reason: interpreted.reason, limit: false };
  if (input.fileCount === 0) return { ok: false, reason: "Add an image.", limit: false };
  return { ok: true, transform: row.transform, settings: interpreted.settings };
}
