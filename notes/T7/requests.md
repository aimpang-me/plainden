F, two shared files still pin the world before this tool exists.

`lib/registry/slugs.test.ts` expects the registry ids to be invoice, pdf, qr, receipt, and scaffold. Add `data` when you merge T7, or stop pinning the id list and keep the duplicate-slug check. T7 did not edit that file. Other batch B tools will hit the same line.

`.cursor/skills/verify-plainden` has no feature id for this tool. The browser proof is `tools/data/proof.mjs`. It drives the server that `plainden-verify.mjs launch` starts. Please register a `data` drive when you fold batch B in.

Saved presets need a server table if they should follow the user. Suggested shape: `data_presets` with `id`, `userId`, `name`, `options` jsonb, `createdAt`, `updatedAt`. A route such as `app/api/data-presets` can call a handler that T7 can add under `tools/data/` once the route exists. Until then the page stores at most 20 presets in `localStorage` key `plainden-data-presets`, and a free plan cannot save.
