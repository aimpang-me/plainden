# Video compressor

The Discord page compresses a short clip in the browser.

## Sub-features

- `video-open` shows the Discord heading.
- `video-compress` downloads an MP4 from `clip.mp4`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/compress-video-for-discord`.
- Add a video and press Compress video.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.
- `public/ffmpeg/ffmpeg-core.js` and `public/ffmpeg/ffmpeg-core.wasm` are present.

- **Compress.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive video`. The heading is `Compress a video for Discord`. The drive adds `e2e/tools-b/fixtures/clip.mp4` and clicks `Compress video`. A download link ends in `.mp4`.
- **Proof.** The drive writes `evidence/video/actions.txt`, `evidence/video/aria.txt`, and `evidence/video/page.png`.

## Gotchas

- The ffmpeg core loads from `/ffmpeg/` and then from blob URLs. The first compress waits on that load.
- The page stays off the landing page while video is in the default hidden set. Open the URL directly.
