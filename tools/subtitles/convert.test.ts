import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { convertSubtitle, gateBatch, jobFor, parseShiftMs } from "./convert";

const sample = readFileSync(path.join(import.meta.dirname, "fixtures/sample.srt"));

const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:07,000
Second line
continues
`;

const sampleVtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello world

00:00:05.500 --> 00:00:07.000
Second line
continues
`;

const shiftedSrt = `1
00:00:02,000 --> 00:00:05,000
Hello world

2
00:00:06,500 --> 00:00:08,000
Second line
continues
`;

const shiftedVtt = `WEBVTT

00:00:02.000 --> 00:00:05.000
Hello world

00:00:06.500 --> 00:00:08.000
Second line
continues
`;

const clampedSrt = `1
00:00:00,000 --> 00:00:01,000
Second line
continues
`;

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

test("srt and vtt round trip with a one second delay", () => {
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "vtt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: sampleVtt,
    fileName: "clip.vtt",
    cueCount: 2,
    format: "vtt",
  });
  expect(
    convertSubtitle({ bytes: utf8(sampleVtt), fileName: "clip.vtt", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: sampleSrt,
    fileName: "clip.srt",
    cueCount: 2,
    format: "srt",
  });
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "srt", shiftMs: 1000 }),
  ).toEqual({
    ok: true,
    text: shiftedSrt,
    fileName: "clip.srt",
    cueCount: 2,
    format: "srt",
  });
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "vtt", shiftMs: 1000 }),
  ).toEqual({
    ok: true,
    text: shiftedVtt,
    fileName: "clip.vtt",
    cueCount: 2,
    format: "vtt",
  });
});

test("a large negative shift drops the first cue and clamps the second", () => {
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "srt", shiftMs: -6000 }),
  ).toEqual({
    ok: true,
    text: clampedSrt,
    fileName: "clip.srt",
    cueCount: 1,
    format: "srt",
  });
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "vtt", shiftMs: -100000 }),
  ).toEqual({
    ok: true,
    text: "WEBVTT\n",
    fileName: "clip.vtt",
    cueCount: 0,
    format: "vtt",
  });
});

test("ass dialogue round trips through srt", () => {
  const ass = `[Script Info]
ScriptType: v4.00+

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello world
Dialogue: 0,0:00:05.50,0:00:07.00,Default,,0,0,0,,Second line\\Ncontinues
`;
  expect(
    convertSubtitle({ bytes: utf8(ass), fileName: "clip.ass", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: sampleSrt,
    fileName: "clip.srt",
    cueCount: 2,
    format: "srt",
  });
  const sampleAss = `[Script Info]
ScriptType: v4.00+

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello world
Dialogue: 0,0:00:05.50,0:00:07.00,Default,,0,0,0,,Second line\\Ncontinues
`;
  expect(
    convertSubtitle({ bytes: utf8(sampleSrt), fileName: "clip.srt", output: "ass", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: sampleAss,
    fileName: "clip.ass",
    cueCount: 2,
    format: "ass",
  });
  expect(
    convertSubtitle({ bytes: utf8(sampleAss), fileName: "clip.ass", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: sampleSrt,
    fileName: "clip.srt",
    cueCount: 2,
    format: "srt",
  });
  const comma = `Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\b1}Hello, world\n`;
  expect(
    convertSubtitle({ bytes: utf8(comma), fileName: "comma.ass", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: `1
00:00:01,000 --> 00:00:02,000
{\\b1}Hello, world
`,
    fileName: "comma.srt",
    cueCount: 1,
    format: "srt",
  });
});

test("vtt cue settings and a missing srt index still convert", () => {
  const vtt = `WEBVTT

intro
00:00:01.000 --> 00:00:04.000 align:start
Hello world
`;
  expect(
    convertSubtitle({ bytes: utf8(vtt), fileName: "clip.vtt", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: `1
00:00:01,000 --> 00:00:04,000
Hello world
`,
    fileName: "clip.srt",
    cueCount: 1,
    format: "srt",
  });
  const bare = `00:00:01,000 --> 00:00:04,000
Hello world
`;
  expect(
    convertSubtitle({ bytes: utf8(bare), fileName: "bare.srt", output: "same", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: `1
00:00:01,000 --> 00:00:04,000
Hello world
`,
    fileName: "bare.srt",
    cueCount: 1,
    format: "srt",
  });
});

test("utf-16 and windows-1252 bytes become utf-8 srt", () => {
  const encoded = Buffer.from(sampleSrt, "utf16le");
  const utf16 = new Uint8Array(2 + encoded.length);
  utf16[0] = 0xff;
  utf16[1] = 0xfe;
  utf16.set(encoded, 2);
  expect(convertSubtitle({ bytes: utf16, fileName: "clip.srt", output: "vtt", shiftMs: 0 })).toEqual({
    ok: true,
    text: sampleVtt,
    fileName: "clip.vtt",
    cueCount: 2,
    format: "vtt",
  });

  const latin = new Uint8Array([
    ...Buffer.from("1\n00:00:01,000 --> 00:00:02,000\nCaf"),
    0xe9,
    0x0a,
  ]);
  expect(
    convertSubtitle({ bytes: latin, fileName: "cafe.srt", output: "srt", shiftMs: 0 }),
  ).toEqual({
    ok: true,
    text: `1
00:00:01,000 --> 00:00:02,000
Café
`,
    fileName: "cafe.srt",
    cueCount: 1,
    format: "srt",
  });
});

test("bad files and a fractional shift are refused", () => {
  expect(
    convertSubtitle({ bytes: utf8("hello"), fileName: "notes.txt", output: "srt", shiftMs: 0 }),
  ).toEqual({ ok: false, reason: "This file is not SRT, VTT, or ASS." });
  expect(
    convertSubtitle({ bytes: utf8("WEBVTT\n"), fileName: "empty.vtt", output: "srt", shiftMs: 0 }),
  ).toEqual({ ok: false, reason: "This file has no cues." });
  expect(
    convertSubtitle({ bytes: sample, fileName: "clip.srt", output: "srt", shiftMs: 1.5 }),
  ).toEqual({ ok: false, reason: "Shift must be a whole number of milliseconds." });
  expect(parseShiftMs("1000")).toBe(1000);
  expect(parseShiftMs("-6000")).toBe(-6000);
  expect(parseShiftMs("1.5")).toBeNull();
  expect(parseShiftMs("")).toBeNull();
});

test("batch size follows the free and paid caps", () => {
  expect(gateBatch("free", 1)).toEqual({ ok: true });
  expect(gateBatch("free", 2)).toEqual({
    ok: false,
    plan: "free",
    kind: "batchCount",
    limit: 1,
    reason: "free batchCount allows 1",
  });
  expect(gateBatch("paid", 50)).toEqual({ ok: true });
  expect(gateBatch("paid", 51)).toEqual({
    ok: false,
    plan: "paid",
    kind: "batchCount",
    limit: 50,
    reason: "paid batchCount allows 50",
  });
});

test("page jobs lock the srt-to-vtt output and apply presets", () => {
  expect(jobFor("srt-to-vtt", undefined)).toEqual({
    output: "vtt",
    shiftMs: 0,
    lockOutput: true,
    note: "Output is WebVTT.",
  });
  expect(jobFor("srt-converter", undefined)).toEqual({
    output: "vtt",
    shiftMs: 0,
    lockOutput: false,
    note: null,
  });
  expect(jobFor("vtt-to-srt", "to-srt")).toEqual({
    output: "srt",
    shiftMs: 0,
    lockOutput: true,
    note: "Output is SRT.",
  });
  expect(jobFor("shift-subtitle-timing", "delay-1000")).toEqual({
    output: "same",
    shiftMs: 1000,
    lockOutput: false,
    note: "This page starts the shift at 1000 ms.",
  });
  expect(jobFor("fix-subtitle-encoding", "fix-encoding")).toEqual({
    output: "same",
    shiftMs: 0,
    lockOutput: false,
    note: "The file is read as UTF-8, UTF-16, or Windows-1252, then saved as UTF-8.",
  });
});
