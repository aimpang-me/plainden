# Data converter shape

## Problem

The data tool turns CSV, JSON, and Excel into each other in the browser, previews a table, and lets a paid plan save presets. T7 owns only `tools/data/`. The planned caps are 5 MB free and 100 MB paid. There is no API route for this tool.

## Usage (caller's view)

The page calls `convert` with a direction, a file name, bytes, and options. It gets either a grid plus download text, or a reason string. `gateBytes` answers the size check before that call. `directionForSlug` and `optionsFromPreset` map the route onto that call.

## Shape

A grid is column names plus rows of strings. A direction is `csv-to-json`, `json-to-csv`, or `excel-to-csv`. Options are the delimiter, the JSON shape, and which sheets to read. `convert` parses bytes at the boundary and returns that grid. Papa Parse and SheetJS stay inside `convert.ts`. Preset storage is a separate list in `presets.ts` so the converter does not write `localStorage`.

## Synthesis decision

The base is one `convert` function. A split into parse, validate, and emit modules lost because each piece would repeat the grid rules. A server table lost for this PR because the browser cannot reach a table without a route T7 does not own. The request for that table is in `notes/T7/requests.md`.

## Tradeoffs accepted

We accept device-local presets in exchange for a working save control inside the owned paths.

We accept string cells in exchange for a CSV and JSON round trip that does not invent number types on the way back.

## Alternatives considered

Three format modules with the page choosing parse and emit. That puts the format rules in the page. One `convert` call hides them.

A Drizzle table in `tools/data/schema.ts` with no route. The table would exist and the page still could not read it.

## Implementation reconciliation

SheetJS treats plain text as a sheet, so `convert` refuses bytes that are not a zip or an OLE workbook before it calls SheetJS. The shared contract is unchanged. The refusal reason is still `This file is not an Excel workbook.`

## Open questions and risks

Should paid presets move to Postgres once F adds a route? The request file says yes.

## Next implementation step

The page and the browser proof are in this same change.
