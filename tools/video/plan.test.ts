import { expect, test } from "vitest";
import { videoBitrate } from "./budget";
import { durationSeconds } from "./duration";
import { gateVideo } from "./gate";
import { initialPresetId, pageNote, presetById } from "./presets";

const mb = 1024 * 1024;

test("free and paid video file sizes", () => {
  expect(gateVideo("free", 100 * mb)).toEqual({ ok: true });
  expect(gateVideo("free", 100 * mb + 1)).toEqual({
    ok: false,
    limit: 100 * mb,
    reason: "free fileSize allows 104857600",
  });
  expect(gateVideo("paid", 500 * mb)).toEqual({ ok: true });
  expect(gateVideo("paid", 500 * mb + 1)).toEqual({
    ok: false,
    limit: 500 * mb,
    reason: "paid fileSize allows 524288000",
  });
});

test("a one minute discord budget stays under 8 MB", () => {
  const discord = presetById("discord");
  if (!discord || discord.kind !== "budget") throw new Error("discord preset missing");
  expect(discord.maxBytes).toBe(8 * mb);
  expect(videoBitrate(60, discord.maxBytes)).toEqual({ videoBps: 942632 });
  const estimate = ((942632 + 64000) * 60) / 8;
  expect(estimate).toBe(7549740);
  expect(estimate).toBeLessThan(8 * mb);
});

test("a video that is too long for 8 MB is refused", () => {
  expect(videoBitrate(581, 8 * mb)).toEqual({
    videoBps: null,
    reason: "This video is too long for the preset size.",
  });
  expect(videoBitrate(0, 8 * mb)).toEqual({
    videoBps: null,
    reason: "Could not read the video length.",
  });
});

test("duration text from ffprobe or an ffmpeg banner", () => {
  expect(durationSeconds("2.500000\n")).toBe(2.5);
  expect(durationSeconds("Duration: 00:01:02.50, start: 0.000000")).toBe(62.5);
  expect(durationSeconds("no duration here")).toBeNull();
});

test("long tail pages pick a preset and the main page does not add a note", () => {
  expect(initialPresetId(undefined)).toBe("discord");
  expect(initialPresetId("480p")).toBe("480p");
  expect(initialPresetId("nope")).toBe("discord");
  expect(pageNote("compress-video-for-discord")).toBe(
    "This page starts on the Discord preset. The target is under 8 MB.",
  );
  expect(pageNote("compress-video")).toBeNull();
  const whatsapp = presetById("whatsapp");
  if (!whatsapp || whatsapp.kind !== "budget") throw new Error("whatsapp preset missing");
  expect(whatsapp.maxBytes).toBe(16 * mb);
  const hd = presetById("720p");
  if (!hd || hd.kind !== "scale") throw new Error("720p preset missing");
  expect(hd.maxHeight).toBe(720);
});
