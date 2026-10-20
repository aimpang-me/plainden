# T6 decisions

WhatsApp targets 16 MB. The plan names the preset and does not give a byte cap. Video messages have used 16 MB, so that is the cap.

Every preset writes `compressed.mp4`. Discord and WhatsApp also scale to at most 720 pixels tall. 720p and 480p scale height only and use CRF 28.

The byte budget keeps 90 percent of the cap for video after 64 kbps audio. A video that cannot keep 40 kbps of video is refused. If the first budget encode is still over the cap, the engine retries once at half the video bitrate and then refuses the file.

File size uses `decideLimit` in the browser. `fileSize` has no usage period, so `checkLimit` would not write a counter. The free cap is 100 MB and the paid cap is 500 MB.

The email long-tail page uses the Discord preset. Both pages target 8 MB.

The ffmpeg client is copied into the tool. Turbopack fails on `new URL` with a variable and on the worker's dynamic import when that worker is bundled. The page loads `/ffmpeg/worker.js` and the core from `/ffmpeg/ffmpeg-core.js` and `/ffmpeg/ffmpeg-core.wasm`.
