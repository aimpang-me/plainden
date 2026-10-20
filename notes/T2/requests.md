# Requests

These checks fail once `tools/legal` and `tools/cookie-refund` register. T2 does not own the files.

- `lib/registry/slugs.test.ts` expects registry ids `invoice`, `pdf`, `qr`, `receipt`, `scaffold`. The list also contains `cookie-refund` and `legal`.
- `lib/pages/resolve.test.ts` expects `privacy-policy-generator` to stay `kind: "planned"`.
- `lib/seo/seo.test.ts` expects `/privacy-policy-generator` to stay a planned page with no FAQPage.
- `e2e/site.spec.ts` expects `This tool is not built yet.` after opening Privacy and terms generator.

T2 already retargeted `drivePlanned` to Image tools at `/compress-image`. F does not need to change that driver.
