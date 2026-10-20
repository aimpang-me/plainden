# T3 decisions

- One tool folder serves merge, split, compress, and JPG to PDF. The slug picks the operation. Long tail slugs use the same prefix, so a new page does not need a second table.
- Free limits use decideLimit plus a localStorage day counter at plainden-pdf-day. The day is UTC. checkLimit is not called from the browser, because it does not store a counter and useEntitlement is still the free plan.
- Paid behavior is in gatePdf. The browser stays on the free plan until getCurrentUser is real.
- Compress re-encodes DCTDecode JPEG streams through canvas at quality 0.5 and skips a result that is not smaller. Other PDF objects stay. The 4 MB page says up to and does not promise 4 MB.
- FileDrop has no multiple or accept attribute. Merge and JPG append each selection. A request for those props is in requests.md.
- Sample JPG is tools/pdf/fixtures/pixel.jpg, an 8 by 8 red image. Tests build PDFs from it with pdf-lib.
- Browser proof runs against the verify-plainden server on port 3100. The helper has no PDF feature id, so tools/pdf/proof.mjs drives that same server and writes tools/pdf/evidence.
