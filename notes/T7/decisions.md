Defaults for the data converter.

Cells are strings. A JSON number becomes its decimal text. Nested objects and arrays are refused.

The first row is the header. JSON objects use those names as keys. JSON rows put the header in the first array.

A single JSON object is one row. An empty file is refused.

Excel defaults to the first sheet. All sheets puts a `# sheet name` line before each sheet in the download. The preview stays the first sheet.

Delimiter choices are comma, semicolon, and tab. Long tail presets set one of those, or the rows shape, or the first sheet.

Free and paid size checks use `decideLimit` in the browser. The caps are 5 MB and 100 MB from the tool config. `checkLimit` is not called from the page, because file size is not a stored counter.

Saved presets live in `localStorage` under `plainden-data-presets`, at most 20, names up to 40 letters, numbers, spaces, or hyphens. A free plan gets the upgrade prompt instead of a write. This is device local because T7 does not own an API route.

The preview shows at most 8 rows. The download has every row.

Output files drop the old extension. `people.csv` becomes `people.json`.
