# T6 dependencies

No extra install. The single-thread core files in `public/ffmpeg/` come from `@ffmpeg/core` 0.12.10. The browser client in `tools/video/ffmpeg-client/` comes from `@ffmpeg/ffmpeg` 0.12.15.

`npm install --no-save` is not used. T6 adds no package. Turbopack cannot compile the published client, so the running site imports the committed copy.
