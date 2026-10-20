export const audioBitrateBps = 64_000;

const safety = 0.9;
const minimumVideoBps = 40_000;

export type Bitrate =
  | { videoBps: number }
  | { videoBps: null; reason: string };

export function videoBitrate(durationSeconds: number, maxBytes: number): Bitrate {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(maxBytes) || maxBytes <= 0) {
    return { videoBps: null, reason: "Could not read the video length." };
  }
  const budgetBits = maxBytes * 8 * safety;
  const videoBits = budgetBits - audioBitrateBps * durationSeconds;
  if (videoBits < durationSeconds * minimumVideoBps) {
    return { videoBps: null, reason: "This video is too long for the preset size." };
  }
  return { videoBps: Math.floor(videoBits / durationSeconds) };
}
