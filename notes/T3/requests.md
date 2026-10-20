# T3 requests

- FileDrop needs a multiple flag and an accept attribute. Merge and JPG currently append one selection at a time. tools/pdf/tool.tsx works around that.
- playwright.config.ts testDir is e2e, which T3 does not own. Browser checks live in tools/pdf/proof.mjs instead of e2e.
- .cursor/skills/verify-plainden has no PDF feature id. proof.mjs drives the server that plainden-verify.mjs launches. A pdf drive id would let the next worker use drive instead of a second script.
- lib/registry/slugs.test.ts expects the registry ids to equal ["scaffold"]. Adding tools/pdf makes that assertion fail. assertUniqueSlugs still passes. T3 does not own that test.
