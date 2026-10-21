# plainden verification map

This directory is the maintained source for the user-facing behavior that exists. Read the index, then use the matching feature file.

## Baseline preconditions

- Launch with `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs launch`.
- The server is `http://127.0.0.1:3100` and its data dir is `.data/verify-pglite`.
- Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs doctor` and require a live pid, HTTP 200, and that data dir.
- Never drive an instance that was not started by this verification run.
- Port 3100 is exclusive. A second launch must fail.

## Driving conventions

- Start every recipe from the baseline state.
- Prefer ARIA roles and accessible names.
- Treat every command as literal.
- Run browser actions through `plainden-verify.mjs drive <feature-id>`.
- Leave files in `evidence/` in place during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot that shows the `plainden` header.
- Record the feature id used with every artifact.
- Report an unreachable path with the command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph. It then uses exactly four H2 sections in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with plainden-verify`
4. `Gotchas`

## Features

- [Landing](./landing.md) lists the planned tools and the support mailto.
- [Scaffold tool](./scaffold-tool.md) checks a count on `/scaffold-check` and shows the upgrade prompt.
- [Planned tool](./planned-tool.md) lists the tools in the sidebar and opens the built privacy form.
- [Invoice generator](./invoice-generator.md) previews a total and caps free PDF downloads at 3.
- [Receipt generator](./receipt-generator.md) shows a PAID stamp and downloads a receipt.
- [PDF tools](./pdf.md) says compress is up to 4 MB, then merges two PDFs.
- [QR code](./qr.md) downloads a static PNG and blocks a free dynamic publish.
- [Privacy policy](./privacy-policy.md) shows each questionnaire answer and blocks a free Markdown download.
- [Image tools](./image.md) compresses a PNG in the browser.
- [Video compressor](./video.md) compresses a clip for Discord.
- [Data converter](./data.md) turns a CSV into a table.
- [Subtitle converter](./subtitles.md) turns an SRT file into a download.
- [SEO](./seo.md) serves the canonical link, JSON-LD, sitemap, and robots file.
- [Pricing](./pricing.md) shows Free, One tool, and All tools, with annual billing two months free.
- [Theme](./theme.md) switches light and dark and stores the choice.
- [Sign in](./sign-in.md) requests a magic link on `/account` and opens it from `.dev-mail`.
