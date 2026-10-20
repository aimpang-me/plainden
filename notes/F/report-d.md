F-d merged T8, T7, T6, T2, and T5 onto main 980d443, in that order, on worker/F-d.
Wave 1 stays public. The default TOOLS_DISABLED list hides scaffold, image, legal, receipt, video, data, subtitles, and cookie-refund. A direct URL still renders.
data_presets is in db/migrations/0000_initial.sql. db/migration.test.ts applies that SQL on PGlite and inserts one row. Paid accounts can GET and POST /api/data-presets. The converter UI still uses localStorage.
heic-to, papaparse, xlsx, and @types/papaparse are in package.json so npm ci installs them.
Production CSP on port 3210 wrote compressed.mp4 (137533 bytes) and frame.jpg (1212 bytes). The console had no CSP refusal. connect-src includes blob:, and HEIC imports heic-to/csp.
A signed-in paid Playwright run publishes a hosted policy and shows the answers. GET /p/not-a-policy returns 404 from proxy.ts. A 32 hex id with no row still streams HTTP 200.
Lighthouse 13.5.0, one run each, scored SEO 100 on /invoice-generator, /merge-pdf, and /qr-code-generator. No SEO audit failed.
eslint passed. Vitest passed 40 files and 147 tests. Playwright passed 98 tests. env -i next build passed (94 pages).
verify-plainden drove planned-tool, seo, image, data, subtitles, video, and privacy-policy.
Vendored ffmpeg comments stayed. An independent review did not run. The other model required on-demand usage.
