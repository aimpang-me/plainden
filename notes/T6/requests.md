# T6 requests

`lib/registry/slugs.test.ts` expects the registry ids to stop at scaffold. Add `video` to that list. The full vitest run fails only on that assertion.

`plainden-verify.mjs drive` has no video feature id. `tools/video/proof.mjs` drove the verification server on port 3100. A later pass can add the feature id. T6 does not own that script.
