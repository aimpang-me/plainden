# Requests

`lib/registry/slugs.test.ts` expects `registry` ids to equal `["scaffold"]`. After `tools/qr` registers, the received value is `["qr", "scaffold"]`. `assertUniqueSlugs` already passed. Please change that assertion so a second built tool can land. T4 cannot edit the test.

`.cursor/skills/verify-plainden/scripts/plainden-verify.mjs` hardcodes feature ids. Please add a `qr` drive for `/qr-code-generator-no-expiration`, `/dynamic-qr-code`, and `GET /q/[id]` with redirects left unfollowed. Until then, `notes/T4/drive-qr.mjs` is the proof, and it needs a seeded row in `.data/verify-pglite` before launch.
