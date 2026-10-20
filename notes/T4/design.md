# QR design

The base is the codec-table design. A second design split the server into a file per step. That lost, because create, edit, delete, and scan would each repeat the row rules. Gemini and the cross-judge could not run. On-demand usage was blocked. The parent scored the two local designs.

`tools/qr/engine.ts` owns the four payloads and the picture. `tools/qr/saved.ts` owns `qr_codes`. The page calls `useQrForm`. The POST route parses JSON and passes an actor that may be null. The scan route only calls `recordScan`.

Grafted from the other design: a typed payload for tests, and a localStorage counter that never blocks a static download. Rejected: a public barrel, a server image endpoint, and one module per SQL verb.

PNG uses `qrcode.toDataURL` instead of rasterizing the SVG. Node tests can read the PNG signature. The SVG is still the file that carries a center logo.
