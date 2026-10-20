# Data converter

The CSV page previews the rows from a small file.

## Sub-features

- `data-open` shows the converter heading.
- `data-convert` shows the Ada cell from `sample.csv`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/csv-to-json`.
- Add a CSV and press Convert.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Convert.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive data`. The heading is `CSV, JSON, and Excel converter`. The drive adds `e2e/tools-b/fixtures/sample.csv` and clicks `Convert`. The Ada cell is visible and the status starts with `Converted`.
- **Proof.** The drive writes `evidence/data/actions.txt`, `evidence/data/aria.txt`, and `evidence/data/page.png`.

## Gotchas

- Saved presets on this page stay in `localStorage`. The server table is `data_presets` behind `POST /api/data-presets`, and a free plan cannot save there.
- The page stays off the landing page while data is in the default hidden set. Open the URL directly.
