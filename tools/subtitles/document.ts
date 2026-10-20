export type Format = "srt" | "vtt" | "ass";

export type Cue = {
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
};

export type SubtitleDoc = {
  readonly cues: readonly Cue[];
};

export type ParseResult =
  | { ok: true; doc: SubtitleDoc; format: Format }
  | { ok: false; reason: string };

const NOT_SUBTITLE = "This file is not SRT, VTT, or ASS.";
const NO_CUES = "This file has no cues.";

function normalize(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function blocks(text: string): string[] {
  const normalized = normalize(text).trim();
  if (normalized.length === 0) return [];
  return normalized.split(/\n{2,}/);
}

function parseClock(raw: string): number | null {
  const match = /^(\d+):(\d{2}):(\d{2})[.,](\d+)$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return null;
  const fraction = match[4] ?? "";
  const millis = Number(fraction.slice(0, 3).padEnd(3, "0"));
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function parseTiming(line: string): { startMs: number; endMs: number } | null {
  const match = /^(\d+:\d{2}:\d{2}[.,]\d+)\s+-->\s+(\d+:\d{2}:\d{2}[.,]\d+)/.exec(line.trim());
  if (!match) return null;
  const startMs = parseClock(match[1] ?? "");
  const endMs = parseClock(match[2] ?? "");
  if (startMs === null || endMs === null) return null;
  return { startMs, endMs };
}

function cueFrom(startMs: number, endMs: number, text: string): Cue | null {
  if (!Number.isInteger(startMs) || !Number.isInteger(endMs)) return null;
  if (startMs < 0 || endMs <= startMs) return null;
  const body = text.replace(/\s+$/g, "");
  if (body.length === 0) return null;
  return { startMs, endMs, text: body };
}

function parseSrt(text: string): SubtitleDoc {
  const cues: Cue[] = [];
  for (const block of blocks(text)) {
    const lines = block.split("\n");
    const first = lines[0] ?? "";
    const second = lines[1] ?? "";
    const timingIndex = !first.includes("-->") && second.includes("-->") ? 1 : 0;
    const timing = parseTiming(lines[timingIndex] ?? "");
    if (!timing) continue;
    const cue = cueFrom(timing.startMs, timing.endMs, lines.slice(timingIndex + 1).join("\n"));
    if (cue) cues.push(cue);
  }
  return { cues };
}

function parseVtt(text: string): SubtitleDoc {
  const cues: Cue[] = [];
  for (const block of blocks(text)) {
    const lines = block.split("\n");
    const head = lines[0]?.trim() ?? "";
    if (head.startsWith("WEBVTT") || /^(NOTE|STYLE|REGION)\b/i.test(head)) continue;
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = parseTiming(lines[timingIndex] ?? "");
    if (!timing) continue;
    const cue = cueFrom(timing.startMs, timing.endMs, lines.slice(timingIndex + 1).join("\n"));
    if (cue) cues.push(cue);
  }
  return { cues };
}

function splitAssFields(payload: string, textCol: number): string[] {
  const fields: string[] = [];
  let rest = payload;
  for (let index = 0; index < textCol; index += 1) {
    const comma = rest.indexOf(",");
    if (comma < 0) {
      fields.push(rest.trim());
      rest = "";
      break;
    }
    fields.push(rest.slice(0, comma).trim());
    rest = rest.slice(comma + 1);
  }
  fields.push(rest.trim());
  return fields;
}

function parseAss(text: string): SubtitleDoc {
  let startCol = 1;
  let endCol = 2;
  let textCol = 9;
  const cues: Cue[] = [];
  for (const raw of normalize(text).split("\n")) {
    const line = raw.trim();
    if (/^format:/i.test(line)) {
      const columns = line
        .slice(line.indexOf(":") + 1)
        .split(",")
        .map((column) => column.trim().toLowerCase());
      const start = columns.indexOf("start");
      const end = columns.indexOf("end");
      const textIndex = columns.indexOf("text");
      if (start >= 0) startCol = start;
      if (end >= 0) endCol = end;
      if (textIndex >= 0) textCol = textIndex;
      continue;
    }
    if (!/^dialogue:/i.test(line)) continue;
    const fields = splitAssFields(line.slice(line.indexOf(":") + 1).trim(), textCol);
    const startMs = parseClock(fields[startCol] ?? "");
    const endMs = parseClock(fields[endCol] ?? "");
    if (startMs === null || endMs === null) continue;
    const body = (fields[textCol] ?? "").replace(/\\N/gi, "\n");
    const cue = cueFrom(startMs, endMs, body);
    if (cue) cues.push(cue);
  }
  return { cues };
}

function detectFormat(text: string): Format | null {
  const body = normalize(text).trim();
  if (body.startsWith("WEBVTT")) return "vtt";
  if (/^\[Script Info\]/im.test(body) || /^Dialogue:/im.test(body)) return "ass";
  if (body.includes("-->")) return "srt";
  return null;
}

export function parseSubtitle(text: string): ParseResult {
  const format = detectFormat(text);
  if (!format) return { ok: false, reason: NOT_SUBTITLE };
  const doc = readDoc(text, format);
  if (doc.cues.length === 0) return { ok: false, reason: NO_CUES };
  return { ok: true, doc, format };
}

function readDoc(text: string, format: Format): SubtitleDoc {
  switch (format) {
    case "srt":
      return parseSrt(text);
    case "vtt":
      return parseVtt(text);
    case "ass":
      return parseAss(text);
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function formatSrtStamp(ms: number): string {
  const total = Math.trunc(ms);
  const millis = total % 1000;
  const seconds = Math.floor(total / 1000);
  const secs = seconds % 60;
  const minutes = Math.floor(seconds / 60);
  return `${pad(Math.floor(minutes / 60), 2)}:${pad(minutes % 60, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

function formatVttStamp(ms: number): string {
  return formatSrtStamp(ms).replace(",", ".");
}

function formatAssStamp(ms: number): string {
  const centi = Math.round(ms / 10);
  const cs = centi % 100;
  const seconds = Math.floor(centi / 100);
  const secs = seconds % 60;
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60, 2)}:${pad(secs, 2)}.${pad(cs, 2)}`;
}

function serializeSrt(doc: SubtitleDoc): string {
  if (doc.cues.length === 0) return "";
  return (
    doc.cues
      .map((cue, index) => {
        return `${index + 1}\n${formatSrtStamp(cue.startMs)} --> ${formatSrtStamp(cue.endMs)}\n${cue.text}`;
      })
      .join("\n\n") + "\n"
  );
}

function serializeVtt(doc: SubtitleDoc): string {
  if (doc.cues.length === 0) return "WEBVTT\n";
  const body = doc.cues
    .map((cue) => `${formatVttStamp(cue.startMs)} --> ${formatVttStamp(cue.endMs)}\n${cue.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

function serializeAss(doc: SubtitleDoc): string {
  const lines = doc.cues.map((cue) => {
    const text = cue.text.replace(/\n/g, "\\N");
    return `Dialogue: 0,${formatAssStamp(cue.startMs)},${formatAssStamp(cue.endMs)},Default,,0,0,0,,${text}`;
  });
  return `[Script Info]\nScriptType: v4.00+\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`;
}

export function serializeSubtitle(doc: SubtitleDoc, format: Format): string {
  switch (format) {
    case "srt":
      return serializeSrt(doc);
    case "vtt":
      return serializeVtt(doc);
    case "ass":
      return serializeAss(doc);
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}

export function shiftDoc(doc: SubtitleDoc, offsetMs: number): SubtitleDoc {
  const cues: Cue[] = [];
  for (const cue of doc.cues) {
    let startMs = cue.startMs + offsetMs;
    const endMs = cue.endMs + offsetMs;
    if (endMs <= 0) continue;
    if (startMs < 0) startMs = 0;
    const next = cueFrom(startMs, endMs, cue.text);
    if (next) cues.push(next);
  }
  return { cues };
}
