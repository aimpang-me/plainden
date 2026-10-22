# Subtitle converter

The SRT page converts one subtitle file in the browser.

## Sub-features

- `subtitles-open` shows the converter heading.
- `subtitles-convert` reports one converted file.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/srt-to-vtt`.
- Add an SRT file and press Convert.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.

- **Convert.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive subtitles`. The heading is `Subtitle converter`. The drive adds `e2e/tools-b/fixtures/sample.srt` and clicks `Convert`. The status is `Converted 1 file.`
- **Proof.** The drive writes `evidence/subtitles/actions.txt`, `evidence/subtitles/aria.txt`, and `evidence/subtitles/page.png`.

## Gotchas

- Subtitle converter is linked from the landing page. Open `/srt-to-vtt` directly for the convert action.
