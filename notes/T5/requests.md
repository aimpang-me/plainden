`lib/registry/slugs.test.ts` expects the registered tool ids to be invoice, pdf, qr, receipt, and scaffold. Once the image tool is registered, that assertion fails. T5 does not edit that test.

The verify-plainden drive has no image feature id. Its ids are scaffold-tool, landing, planned-tool, pricing, theme, sign-in, invoice-generator, receipt-generator, pdf, qr, and seo.
