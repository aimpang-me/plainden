import Papa from "papaparse";
import * as XLSX from "xlsx";
import { LimitKind } from "../../lib/contract/limits";
import type { LimitDecision } from "../../lib/contract/types";
import { decideLimit } from "../../lib/entitlements/decide-limit";
import { config } from "./config";

export type Direction = "csv-to-json" | "json-to-csv" | "excel-to-csv";

export type Delimiter = "," | ";" | "\t";

export type JsonShape = "objects" | "rows";

export type SheetChoice = "first" | "all";

export type Options = {
  delimiter: Delimiter;
  jsonShape: JsonShape;
  sheet: SheetChoice;
};

export type Grid = {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

export type Converted = {
  grid: Grid;
  text: string;
  filename: string;
  mime: "application/json" | "text/csv";
  rowCount: number;
  note: string;
};

export type ConvertResult = { ok: true; converted: Converted } | { ok: false; reason: string };

export const defaultOptions: Options = {
  delimiter: ",",
  jsonShape: "objects",
  sheet: "first",
};

const slugDirection: Record<string, Direction> = {
  "csv-to-json": "csv-to-json",
  "json-to-csv": "json-to-csv",
  "excel-to-csv": "excel-to-csv",
  "csv-to-json-objects": "csv-to-json",
  "semicolon-csv-to-json": "csv-to-json",
  "json-rows-to-csv": "json-to-csv",
  "excel-first-sheet-to-csv": "excel-to-csv",
  "tab-separated-to-json": "csv-to-json",
};

const presetPatch: Record<string, Partial<Options>> = {
  objects: { jsonShape: "objects", delimiter: ",", sheet: "first" },
  semicolon: { delimiter: ";" },
  rows: { jsonShape: "rows" },
  "first-sheet": { sheet: "first" },
  tab: { delimiter: "\t" },
};

export function directionForSlug(slug: string): Direction | null {
  return slugDirection[slug] ?? null;
}

export function missingFileReason(direction: Direction): string {
  switch (direction) {
    case "csv-to-json":
      return "Add a CSV file.";
    case "json-to-csv":
      return "Add a JSON file.";
    case "excel-to-csv":
      return "Add an Excel file.";
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}

export function acceptsFilename(direction: Direction, filename: string): boolean {
  const lower = filename.toLowerCase();
  switch (direction) {
    case "csv-to-json":
      return lower.endsWith(".csv");
    case "json-to-csv":
      return lower.endsWith(".json");
    case "excel-to-csv":
      return lower.endsWith(".xlsx") || lower.endsWith(".xls");
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}

export function fileAccept(direction: Direction): string {
  switch (direction) {
    case "csv-to-json":
      return ".csv,text/csv";
    case "json-to-csv":
      return ".json,application/json";
    case "excel-to-csv":
      return ".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}

export function optionsFromPreset(preset: string | undefined): Options {
  if (!preset) return { ...defaultOptions };
  const patch = presetPatch[preset];
  if (!patch) return { ...defaultOptions };
  return { ...defaultOptions, ...patch };
}

export function optionNote(options: Options): string {
  const delimiter = options.delimiter === ";" ? "semicolon" : options.delimiter === "\t" ? "tab" : "comma";
  const shape = options.jsonShape === "rows" ? "rows" : "objects";
  const sheet = options.sheet === "all" ? "all sheets" : "the first sheet";
  return `Delimiter is ${delimiter}. JSON shape is ${shape}. Excel uses ${sheet}.`;
}

export function gateBytes(plan: "free" | "paid", bytes: number): LimitDecision {
  return decideLimit({
    plan,
    limits: config.limits,
    kind: LimitKind.fileSize,
    amount: bytes,
  });
}

export function convert(input: {
  direction: Direction;
  filename: string;
  bytes: Uint8Array;
  options: Options;
}): ConvertResult {
  switch (input.direction) {
    case "csv-to-json":
      return csvToJson(input.filename, input.bytes, input.options);
    case "json-to-csv":
      return jsonToCsv(input.filename, input.bytes, input.options);
    case "excel-to-csv":
      return excelToCsv(input.filename, input.bytes, input.options);
    default: {
      const unreachable: never = input.direction;
      return unreachable;
    }
  }
}

function csvToJson(filename: string, bytes: Uint8Array, options: Options): ConvertResult {
  const parsed = parseCsv(decode(bytes), options.delimiter);
  if (!parsed.ok) return parsed;
  const text = options.jsonShape === "rows" ? rowsJson(parsed.grid) : objectsJson(parsed.grid);
  return {
    ok: true,
    converted: {
      grid: parsed.grid,
      text,
      filename: outputName(filename, "json"),
      mime: "application/json",
      rowCount: parsed.grid.rows.length,
      note: "",
    },
  };
}

function jsonToCsv(filename: string, bytes: Uint8Array, options: Options): ConvertResult {
  const parsed = parseJson(decode(bytes), options.jsonShape);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    converted: {
      grid: parsed.grid,
      text: csvText(parsed.grid, options.delimiter),
      filename: outputName(filename, "csv"),
      mime: "text/csv",
      rowCount: parsed.grid.rows.length,
      note: "",
    },
  };
}

function looksLikeWorkbook(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return zip || ole;
}

function excelToCsv(filename: string, bytes: Uint8Array, options: Options): ConvertResult {
  if (!looksLikeWorkbook(bytes)) return { ok: false, reason: "This file is not an Excel workbook." };
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(bytes, { type: "array" });
  } catch {
    return { ok: false, reason: "This file is not an Excel workbook." };
  }
  const names = options.sheet === "first" ? book.SheetNames.slice(0, 1) : book.SheetNames;
  if (names.length === 0) return { ok: false, reason: "This workbook has no sheets." };
  const parts: string[] = [];
  let preview: Grid | null = null;
  let rowCount = 0;
  for (const name of names) {
    const sheet = book.Sheets[name];
    if (!sheet) continue;
    const grid = sheetGrid(sheet);
    if (!grid) continue;
    preview ??= grid;
    rowCount += grid.rows.length;
    const csv = csvText(grid, options.delimiter);
    parts.push(names.length > 1 ? `# ${name}\n${csv}` : csv);
  }
  if (!preview || parts.length === 0) return { ok: false, reason: "This workbook has no rows." };
  const several = names.length > 1 && parts.length > 1;
  return {
    ok: true,
    converted: {
      grid: preview,
      text: parts.join("\n"),
      filename: outputName(filename, "csv"),
      mime: "text/csv",
      rowCount,
      note: several ? "The preview is the first sheet. The download includes every sheet." : "",
    },
  };
}

function parseCsv(text: string, delimiter: Delimiter): { ok: true; grid: Grid } | { ok: false; reason: string } {
  if (text.includes("\u0000")) return { ok: false, reason: "This file is not valid CSV." };
  const parsed = Papa.parse<string[]>(text, {
    delimiter,
    header: false,
    skipEmptyLines: "greedy",
  });
  const records = parsed.data.filter((row) => Array.isArray(row) && row.some((cell) => String(cell) !== ""));
  if (records.length === 0) return { ok: false, reason: "This file has no rows." };
  const [header, ...data] = records;
  if (!header) return { ok: false, reason: "This file has no rows." };
  return { ok: true, grid: makeGrid(header.map(stringCell), data.map((row) => row.map(stringCell))) };
}

function parseJson(
  text: string,
  shape: JsonShape,
): { ok: true; grid: Grid } | { ok: false; reason: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "This file is not valid JSON." };
  }
  if (shape === "rows") return rowsToGrid(value);
  return objectsToGrid(value);
}

function objectsToGrid(value: unknown): { ok: true; grid: Grid } | { ok: false; reason: string } {
  const records = Array.isArray(value) ? value : [value];
  if (!records.every(isRecord)) return { ok: false, reason: "JSON must be an array of objects." };
  if (records.length === 0) return { ok: false, reason: "This file has no rows." };
  const columns: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!scalarText(record[key]).ok) {
        return { ok: false, reason: "JSON values must be text, numbers, booleans, or null." };
      }
      if (!columns.includes(key)) columns.push(key);
    }
  }
  if (columns.length === 0) return { ok: false, reason: "This file has no rows." };
  const rows = records.map((record) =>
    columns.map((column) => {
      if (!Object.hasOwn(record, column)) return "";
      const read = scalarText(record[column]);
      return read.ok ? read.text : "";
    }),
  );
  return { ok: true, grid: makeGrid(columns, rows) };
}

function rowsToGrid(value: unknown): { ok: true; grid: Grid } | { ok: false; reason: string } {
  if (!Array.isArray(value) || !value.every(Array.isArray)) {
    return { ok: false, reason: "JSON must be an array of arrays." };
  }
  if (value.length === 0) return { ok: false, reason: "This file has no rows." };
  const matrix: string[][] = [];
  for (const row of value) {
    const cells: string[] = [];
    for (const cell of row) {
      const read = scalarText(cell);
      if (!read.ok) return { ok: false, reason: "JSON values must be text, numbers, booleans, or null." };
      cells.push(read.text);
    }
    matrix.push(cells);
  }
  const [header, ...data] = matrix;
  if (!header || header.length === 0) return { ok: false, reason: "This file has no rows." };
  return { ok: true, grid: makeGrid(header, data) };
}

function sheetGrid(sheet: XLSX.WorkSheet): Grid | null {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  if (!Array.isArray(raw)) return null;
  const matrix = raw.filter(Array.isArray).map((row) => row.map(stringCell));
  const records = matrix.filter((row) => row.some((cell) => cell !== ""));
  if (records.length === 0) return null;
  const [header, ...data] = records;
  if (!header) return null;
  return makeGrid(header, data);
}

function makeGrid(header: readonly string[], data: readonly (readonly string[])[]): Grid {
  const columns = uniqueColumns(header);
  const width = columns.length;
  const rows = data.map((row) => {
    const next = row.slice(0, width).map(stringCell);
    while (next.length < width) next.push("");
    return next;
  });
  return { columns, rows };
}

function uniqueColumns(header: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return header.map((column, index) => {
    const label = column.length > 0 ? column : `column ${index + 1}`;
    const count = (seen.get(label) ?? 0) + 1;
    seen.set(label, count);
    return count === 1 ? label : `${label} (${count})`;
  });
}

function objectsJson(grid: Grid): string {
  const records = grid.rows.map((row) => {
    const record: Record<string, string> = Object.create(null);
    grid.columns.forEach((column, index) => {
      Object.defineProperty(record, column, {
        value: row[index] ?? "",
        enumerable: true,
        writable: true,
        configurable: true,
      });
    });
    return record;
  });
  return `${JSON.stringify(records, null, 2)}\n`;
}

function rowsJson(grid: Grid): string {
  return `${JSON.stringify([grid.columns, ...grid.rows], null, 2)}\n`;
}

function csvText(grid: Grid, delimiter: Delimiter): string {
  return Papa.unparse([grid.columns, ...grid.rows], { delimiter, newline: "\n" });
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
}

function outputName(filename: string, extension: "json" | "csv"): string {
  const leaf = filename.split(/[/\\]/).pop() ?? "";
  const dot = leaf.lastIndexOf(".");
  const stem = (dot > 0 ? leaf.slice(0, dot) : leaf).replace(/[^A-Za-z0-9._ -]/g, "").trim();
  return `${stem.length > 0 ? stem : "download"}.${extension}`;
}

function stringCell(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function scalarText(value: unknown): { ok: true; text: string } | { ok: false } {
  if (value === null) return { ok: true, text: "" };
  if (typeof value === "string" || typeof value === "boolean") return { ok: true, text: stringCell(value) };
  if (typeof value === "number" && Number.isFinite(value)) return { ok: true, text: String(value) };
  return { ok: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
