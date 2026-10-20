Static QR for a link, text, Wi-Fi, and a contact downloads PNG and SVG in the browser.
GET /q/[id] returns 302 to the stored target and sets x-plainden-scans. A second request returned scans 2.
A free publish is refused with "free savedItems allows 0". A paid publish works. The 21st code is refused. A lapsed plan cannot edit, and the redirect still counts.
next build passed with no app env vars. eslint . passed with no warnings.
npx vitest run tools/qr passed 12 tests.
npm test failed one assertion. lib/registry/slugs.test.ts expects ["scaffold"] and received ["qr", "scaffold"].
Browser proof is notes/T4/evidence/qr/actions.txt. verify-plainden launch and doctor passed on port 3100. The skill has no QR feature id.
qrcode@1.5.4 is installed with npm install --no-save and is not in package.json.
Sign-in still returns null, so the browser cannot save a dynamic code yet.
