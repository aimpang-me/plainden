`lib/registry/slugs.test.ts` expects the registry ids `invoice`, `pdf`, `qr`, `receipt`, and `scaffold`. Add `subtitles` to that list. `npm test` fails on this branch until that line changes, and T8 does not own the file.

`.cursor/skills/verify-plainden` has no feature id for this tool. The browser proof is `node tools/subtitles/proof.mjs` after `plainden-verify.mjs launch` and `doctor`.

Wave 3 should list `subtitles` in `TOOLS_DISABLED` until that wave ships. T8 does not own the switch.
