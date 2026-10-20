import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { expect, test } from "vitest";
import { copy } from "./copy";
import { config } from "./config";
import {
  acceptsFilename,
  convert,
  directionForSlug,
  gateBytes,
  missingFileReason,
  optionsFromPreset,
  optionNote,
  type Direction,
} from "./convert";

const fixtureDir = path.join(import.meta.dirname, "fixtures");
const objectsJson = readFileSync(path.join(fixtureDir, "people.json"), "utf8");
const rowsJson = readFileSync(path.join(fixtureDir, "people-rows.json"), "utf8");
const csvText = "name,city\nAda,Oslo\nBea,Lima";

function requireDirection(slug: string): Direction {
  const direction = directionForSlug(slug);
  expect(direction).not.toBeNull();
  if (direction === null) throw new Error(`missing direction for ${slug}`);
  return direction;
}

test("sample csv and json round trip", () => {
  const csvBytes = new Uint8Array(readFileSync(path.join(fixtureDir, "people.csv")));
  const toJson = convert({
    direction: "csv-to-json",
    filename: "people.csv",
    bytes: csvBytes,
    options: optionsFromPreset(undefined),
  });
  expect(toJson).toEqual({
    ok: true,
    converted: {
      grid: {
        columns: ["name", "city"],
        rows: [
          ["Ada", "Oslo"],
          ["Bea", "Lima"],
        ],
      },
      text: objectsJson,
      filename: "people.json",
      mime: "application/json",
      rowCount: 2,
      note: "",
    },
  });
  if (!toJson.ok) return;
  const back = convert({
    direction: "json-to-csv",
    filename: toJson.converted.filename,
    bytes: new TextEncoder().encode(toJson.converted.text),
    options: optionsFromPreset(undefined),
  });
  expect(back).toEqual({
    ok: true,
    converted: {
      grid: {
        columns: ["name", "city"],
        rows: [
          ["Ada", "Oslo"],
          ["Bea", "Lima"],
        ],
      },
      text: csvText,
      filename: "people.csv",
      mime: "text/csv",
      rowCount: 2,
      note: "",
    },
  });
});

test("sample excel becomes the same csv", () => {
  const bytes = new Uint8Array(readFileSync(path.join(fixtureDir, "people.xlsx")));
  const result = convert({
    direction: "excel-to-csv",
    filename: "people.xlsx",
    bytes,
    options: optionsFromPreset("first-sheet"),
  });
  expect(result).toEqual({
    ok: true,
    converted: {
      grid: {
        columns: ["name", "city"],
        rows: [
          ["Ada", "Oslo"],
          ["Bea", "Lima"],
        ],
      },
      text: csvText,
      filename: "people.csv",
      mime: "text/csv",
      rowCount: 2,
      note: "",
    },
  });
});

test("semicolon and tab presets and json rows round trip", () => {
  const semicolon = convert({
    direction: requireDirection("semicolon-csv-to-json"),
    filename: "people.csv",
    bytes: new Uint8Array(readFileSync(path.join(fixtureDir, "people-semicolon.csv"))),
    options: optionsFromPreset("semicolon"),
  });
  expect(semicolon.ok && semicolon.converted.text).toBe(objectsJson);

  const tabbed = convert({
    direction: requireDirection("tab-separated-to-json"),
    filename: "people.csv",
    bytes: new Uint8Array(readFileSync(path.join(fixtureDir, "people-tab.csv"))),
    options: optionsFromPreset("tab"),
  });
  expect(tabbed.ok && tabbed.converted.text).toBe(objectsJson);

  const toRows = convert({
    direction: "csv-to-json",
    filename: "people.csv",
    bytes: new TextEncoder().encode(csvText),
    options: optionsFromPreset("rows"),
  });
  expect(toRows.ok && toRows.converted.text).toBe(rowsJson);
  if (!toRows.ok) return;
  const back = convert({
    direction: requireDirection("json-rows-to-csv"),
    filename: "people-rows.json",
    bytes: new TextEncoder().encode(toRows.converted.text),
    options: optionsFromPreset("rows"),
  });
  expect(back.ok && back.converted.text).toBe(csvText);
});

test("quoted commas, numbers, and a hostile key survive", () => {
  const quoted = convert({
    direction: "csv-to-json",
    filename: "quoted.csv",
    bytes: new TextEncoder().encode('name,city\n"Ada, Jr",Oslo'),
    options: optionsFromPreset(undefined),
  });
  expect(quoted.ok && quoted.converted.grid.rows).toEqual([["Ada, Jr", "Oslo"]]);
  if (!quoted.ok) return;
  const back = convert({
    direction: "json-to-csv",
    filename: quoted.converted.filename,
    bytes: new TextEncoder().encode(quoted.converted.text),
    options: optionsFromPreset(undefined),
  });
  expect(back.ok && back.converted.text).toBe('name,city\n"Ada, Jr",Oslo');

  const numbers = convert({
    direction: "json-to-csv",
    filename: "qty.json",
    bytes: new TextEncoder().encode('[{"name":"Ada","qty":2}]'),
    options: optionsFromPreset(undefined),
  });
  expect(numbers.ok && numbers.converted.text).toBe("name,qty\nAda,2");

  const hostile = convert({
    direction: "json-to-csv",
    filename: "edge.json",
    bytes: new TextEncoder().encode('[{"__proto__":"x","name":"Ada"}]'),
    options: optionsFromPreset(undefined),
  });
  expect(hostile.ok && hostile.converted.text).toBe("__proto__,name\nx,Ada");
});

test("bad files and the size gate refuse with the page text", () => {
  expect(
    convert({
      direction: "json-to-csv",
      filename: "bad.json",
      bytes: new TextEncoder().encode("{"),
      options: optionsFromPreset(undefined),
    }),
  ).toEqual({ ok: false, reason: "This file is not valid JSON." });
  expect(
    convert({
      direction: "json-to-csv",
      filename: "nested.json",
      bytes: new TextEncoder().encode('[{"name":{"first":"Ada"}}]'),
      options: optionsFromPreset(undefined),
    }),
  ).toEqual({ ok: false, reason: "JSON values must be text, numbers, booleans, or null." });
  expect(
    convert({
      direction: "csv-to-json",
      filename: "empty.csv",
      bytes: new TextEncoder().encode("\n"),
      options: optionsFromPreset(undefined),
    }),
  ).toEqual({ ok: false, reason: "This file has no rows." });
  expect(
    convert({
      direction: "excel-to-csv",
      filename: "notes.xlsx",
      bytes: new TextEncoder().encode("not a workbook"),
      options: optionsFromPreset("first-sheet"),
    }),
  ).toEqual({ ok: false, reason: "This file is not an Excel workbook." });
  expect(gateBytes("free", 5 * 1024 * 1024 + 1)).toEqual({
    ok: false,
    limit: 5 * 1024 * 1024,
    reason: "free fileSize allows 5242880",
  });
  expect(gateBytes("paid", 5 * 1024 * 1024 + 1)).toEqual({ ok: true });
  expect(gateBytes("paid", 100 * 1024 * 1024 + 1)).toEqual({
    ok: false,
    limit: 100 * 1024 * 1024,
    reason: "paid fileSize allows 104857600",
  });
  expect(missingFileReason("excel-to-csv")).toBe("Add an Excel file.");
  expect(acceptsFilename("csv-to-json", "people.csv")).toBe(true);
  expect(acceptsFilename("csv-to-json", "people.xlsx")).toBe(false);
});

test("every published slug has a direction and the semicolon page states its delimiter", () => {
  const routes: Record<string, Direction> = {
    "csv-to-json": "csv-to-json",
    "json-to-csv": "json-to-csv",
    "excel-to-csv": "excel-to-csv",
    "csv-to-json-objects": "csv-to-json",
    "semicolon-csv-to-json": "csv-to-json",
    "json-rows-to-csv": "json-to-csv",
    "excel-first-sheet-to-csv": "excel-to-csv",
    "tab-separated-to-json": "csv-to-json",
  };
  const slugs = [...config.slugs, ...copy.longTail.map((page) => page.slug)];
  expect(config.seoPages).toEqual(copy.longTail.map((page) => page.slug));
  expect(slugs.sort()).toEqual(Object.keys(routes).sort());
  for (const [slug, direction] of Object.entries(routes)) expect(directionForSlug(slug)).toBe(direction);
  expect(directionForSlug("not-a-converter")).toBeNull();
  expect(optionNote(optionsFromPreset("semicolon"))).toBe(
    "Delimiter is semicolon. JSON shape is objects. Excel uses the first sheet.",
  );
});

test("all sheets stay in the download and the first sheet is the preview", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["name", "city"],
      ["Ada", "Oslo"],
    ]),
    "People",
  );
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["city"], ["Lima"]]), "Places");
  const bytes = new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
  const first = convert({
    direction: "excel-to-csv",
    filename: "book.xlsx",
    bytes,
    options: optionsFromPreset("first-sheet"),
  });
  expect(first.ok && first.converted.text).toBe("name,city\nAda,Oslo");
  const all = convert({
    direction: "excel-to-csv",
    filename: "book.xlsx",
    bytes,
    options: { delimiter: ",", jsonShape: "objects", sheet: "all" },
  });
  expect(all.ok && all.converted.text).toBe("# People\nname,city\nAda,Oslo\n# Places\ncity\nLima");
  expect(all.ok && all.converted.grid.rows).toEqual([["Ada", "Oslo"]]);
  expect(all.ok && all.converted.note).toBe("The preview is the first sheet. The download includes every sheet.");
});
