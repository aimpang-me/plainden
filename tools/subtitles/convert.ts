import { LimitKind } from "../../lib/contract/limits";
import type { LimitDecision } from "../../lib/contract/types";
import { decideLimit } from "../../lib/entitlements/decide-limit";
import { config } from "./config";
import { parseSubtitle, serializeSubtitle, shiftDoc, type Format } from "./document";

export type OutputChoice = Format | "same";

export type ConvertResult =
  | { ok: true; text: string; fileName: string; cueCount: number; format: Format }
  | { ok: false; reason: string };

export type SubtitleJob = {
  output: OutputChoice;
  shiftMs: number;
  lockOutput: boolean;
  note: string | null;
};

const SHIFT_REASON = "Shift must be a whole number of milliseconds.";

const presetJobs: Record<string, { output: OutputChoice; shiftMs: number; note: string; lockOutput: boolean }> = {
  "to-srt": { output: "srt", shiftMs: 0, note: "Output is SRT.", lockOutput: true },
  "to-vtt": { output: "vtt", shiftMs: 0, note: "Output is WebVTT.", lockOutput: true },
  "to-ass": { output: "ass", shiftMs: 0, note: "Output is ASS.", lockOutput: true },
  "delay-1000": {
    output: "same",
    shiftMs: 1000,
    note: "This page starts the shift at 1000 ms.",
    lockOutput: false,
  },
  "fix-encoding": {
    output: "same",
    shiftMs: 0,
    note: "The file is read as UTF-8, UTF-16, or Windows-1252, then saved as UTF-8.",
    lockOutput: false,
  },
};

export function parseShiftMs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

export function decodeSubtitle(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  const payload = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(payload);
  } catch {
    return new TextDecoder("windows-1252").decode(payload);
  }
}

function replaceExt(fileName: string, format: Format): string {
  const ext = format === "vtt" ? ".vtt" : format === "ass" ? ".ass" : ".srt";
  const stripped = fileName.replace(/\.(srt|vtt|ass|ssa)$/i, "").trim();
  return `${stripped.length > 0 ? stripped : "subtitles"}${ext}`;
}

export function convertSubtitle(input: {
  bytes: Uint8Array;
  fileName: string;
  output: OutputChoice;
  shiftMs: number;
}): ConvertResult {
  if (!Number.isSafeInteger(input.shiftMs)) return { ok: false, reason: SHIFT_REASON };
  const text = decodeSubtitle(input.bytes);
  const parsed = parseSubtitle(text);
  if (!parsed.ok) return parsed;
  const format = input.output === "same" ? parsed.format : input.output;
  const shifted = shiftDoc(parsed.doc, input.shiftMs);
  return {
    ok: true,
    text: serializeSubtitle(shifted, format),
    fileName: replaceExt(input.fileName, format),
    cueCount: shifted.cues.length,
    format,
  };
}

export function gateBatch(plan: "free" | "paid", count: number): LimitDecision {
  return decideLimit({
    plan,
    limits: config.limits,
    kind: LimitKind.batchCount,
    amount: count,
  });
}

export function jobFor(slug: string, preset: string | undefined): SubtitleJob {
  if (slug === "srt-to-vtt") {
    return { output: "vtt", shiftMs: 0, lockOutput: true, note: "Output is WebVTT." };
  }
  const presetJob = preset ? presetJobs[preset] : undefined;
  if (presetJob) return presetJob;
  return { output: "vtt", shiftMs: 0, lockOutput: false, note: null };
}

export function outputChoices(): readonly { value: OutputChoice; label: string }[] {
  return [
    { value: "vtt", label: "WebVTT" },
    { value: "srt", label: "SRT" },
    { value: "ass", label: "ASS" },
    { value: "same", label: "Same format" },
  ];
}

export function readOutput(value: string): OutputChoice | null {
  switch (value) {
    case "srt":
    case "vtt":
    case "ass":
    case "same":
      return value;
    default:
      return null;
  }
}
