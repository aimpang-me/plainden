import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export type ImageFormat = "png" | "jpeg" | "webp";

export type ImageInfo = {
  format: ImageFormat;
  width: number;
  height: number;
};

export type VideoInfo = {
  codec: string;
  width: number;
  height: number;
};

export type Cue = {
  startMs: number;
  endMs: number;
  text: string;
};

export function imageInfo(bytes: Buffer): ImageInfo {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return { format: "jpeg", ...jpegSize(bytes) };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { format: "webp", ...webpSize(bytes) };
  }
  throw new Error(`not a png, jpeg, or webp (${bytes.length} bytes)`);
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export function parseCues(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split(/\n\n+/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) continue;
    const [start, end] = timeLine.split("-->").map((part) => part.trim().split(/\s+/)[0] ?? "");
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    cues.push({ startMs: stampToMs(start), endMs: stampToMs(end), text: textLines.join("\n") });
  }
  return cues;
}

export function longTailSlugs(toolId: string): string[] | null {
  const dir = path.join(process.cwd(), "tools", toolId);
  if (!existsSync(dir)) return null;
  const slugs = new Set<string>();
  for (const name of ["copy.ts", "engine.ts"]) {
    const file = path.join(dir, name);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    const marker = source.indexOf("longTail");
    if (marker < 0) continue;
    for (const match of source.slice(marker).matchAll(/slug:\s*["']([^"']+)["']/g)) {
      slugs.add(match[1]);
    }
  }
  return [...slugs];
}

export function probeVideo(bytes: Buffer): VideoInfo {
  const dir = mkdtempSync(path.join(tmpdir(), "plainden-video-"));
  const file = path.join(dir, "clip.mp4");
  try {
    writeFileSync(file, bytes);
    const result = spawnSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height", "-of", "json", file],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      const detail = result.stderr || result.error?.message || "ffprobe failed";
      throw new Error(detail);
    }
    return readProbe(result.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function jpegSize(bytes: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    const startOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (startOfFrame) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("jpeg size missing");
}

function webpSize(bytes: Buffer): { width: number; height: number } {
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    const frame = 20;
    return {
      width: bytes.readUInt16LE(frame + 6) & 0x3fff,
      height: bytes.readUInt16LE(frame + 8) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }
  throw new Error(`webp chunk ${chunk} has no size`);
}

function stampToMs(stamp: string): number {
  const match = stamp.match(/^(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{1,3})$/);
  if (!match) throw new Error(`bad stamp ${stamp}`);
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = match[4] ?? "";
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + fractionMs(fraction);
}

function fractionMs(raw: string): number {
  if (raw.length === 3) return Number(raw);
  if (raw.length === 2) return Number(raw) * 10;
  if (raw.length === 1) return Number(raw) * 100;
  throw new Error(`bad fraction ${raw}`);
}

function readProbe(stdout: string): VideoInfo {
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null || !("streams" in parsed)) {
    throw new Error("ffprobe returned no streams");
  }
  const streams = parsed.streams;
  if (!Array.isArray(streams) || streams.length === 0) throw new Error("ffprobe returned no video stream");
  const stream: unknown = streams[0];
  if (typeof stream !== "object" || stream === null) throw new Error("ffprobe stream was empty");
  if (!("codec_name" in stream) || !("width" in stream) || !("height" in stream)) {
    throw new Error("ffprobe stream missed codec or size");
  }
  const codec = stream.codec_name;
  const width = stream.width;
  const height = stream.height;
  if (typeof codec !== "string" || typeof width !== "number" || typeof height !== "number") {
    throw new Error("ffprobe stream had the wrong types");
  }
  return { codec, width, height };
}
