import { FFmpeg, FFFSType } from "./ffmpeg-client/index.js";
import { audioBitrateBps, videoBitrate } from "./budget";
import { durationSeconds } from "./duration";
import type { VideoPreset } from "./presets";

const coreScript = "/ffmpeg/ffmpeg-core.js";
const coreWasm = "/ffmpeg/ffmpeg-core.wasm";
const inputDir = "/input";
const inputPath = "/input/source";
const outputPath = "compressed.mp4";

export type CompressResult =
  | { ok: true; name: "compressed.mp4"; bytes: Uint8Array; message: string }
  | { ok: false; reason: string };

let session: FFmpeg | null = null;
let workerFs: (typeof FFFSType)["WORKERFS"] | null = null;
let pending: Promise<void> = Promise.resolve();

export function compressVideo(file: File, preset: VideoPreset): Promise<CompressResult> {
  const run = pending.then(() => runCompress(file, preset));
  pending = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function blobUrl(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: mimeType }));
}

async function core(): Promise<FFmpeg> {
  if (session && workerFs) return session;
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await blobUrl(coreScript, "text/javascript"),
    wasmURL: await blobUrl(coreWasm, "application/wasm"),
  });
  workerFs = FFFSType.WORKERFS;
  session = ffmpeg;
  return ffmpeg;
}

function scaleFilter(maxHeight: number): string {
  return `scale=-2:'min(${maxHeight},ih)'`;
}

function encodeArgs(preset: VideoPreset, videoBps: number | null): string[] {
  const args = [
    "-i",
    inputPath,
    "-vf",
    scaleFilter(preset.maxHeight),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
  ];
  if (videoBps === null) {
    args.push("-crf", "28");
  } else {
    const rate = String(videoBps);
    args.push("-b:v", rate, "-maxrate", rate, "-bufsize", String(videoBps * 2));
  }
  args.push("-c:a", "aac", "-b:a", String(audioBitrateBps), "-movflags", "+faststart", outputPath);
  return args;
}

function copyBytes(data: Uint8Array | string): Uint8Array | null {
  if (typeof data === "string") return null;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy;
}

async function encode(ffmpeg: FFmpeg, args: string[]): Promise<Uint8Array | null> {
  const code = await ffmpeg.exec(args);
  if (code !== 0) return null;
  return copyBytes(await ffmpeg.readFile(outputPath));
}

async function runCompress(file: File, preset: VideoPreset): Promise<CompressResult> {
  const ffmpeg = await core();
  const filesystem = workerFs;
  if (!filesystem) return { ok: false, reason: "Compression failed." };
  const lines: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    lines.push(message);
  };
  ffmpeg.on("log", onLog);
  try {
    await ffmpeg.createDir(inputDir).catch(() => undefined);
    await ffmpeg.unmount(inputDir).catch(() => undefined);
    const source = new File([file], "source", { type: file.type || "video/mp4" });
    const mounted = await ffmpeg.mount(filesystem, { files: [source] }, inputDir);
    if (!mounted) return { ok: false, reason: "Could not read the video file." };
    await ffmpeg.exec(["-hide_banner", "-i", inputPath]);
    const duration = durationSeconds(lines.join("\n"));
    if (duration === null) return { ok: false, reason: "Could not read the video length." };

    let videoBps: number | null = null;
    if (preset.kind === "budget") {
      const budget = videoBitrate(duration, preset.maxBytes);
      if (budget.videoBps === null) return { ok: false, reason: budget.reason };
      videoBps = budget.videoBps;
    } else if (preset.kind === "scale") {
      videoBps = null;
    } else {
      const unreachable: never = preset;
      return unreachable;
    }

    let bytes = await encode(ffmpeg, encodeArgs(preset, videoBps));
    if (!bytes) return { ok: false, reason: "Compression failed." };
    if (preset.kind === "budget" && bytes.byteLength > preset.maxBytes && videoBps !== null) {
      await ffmpeg.deleteFile(outputPath).catch(() => undefined);
      bytes = await encode(ffmpeg, encodeArgs(preset, Math.max(1, Math.floor(videoBps / 2))));
      if (!bytes) return { ok: false, reason: "Compression failed." };
      if (bytes.byteLength > preset.maxBytes) {
        await ffmpeg.deleteFile(outputPath).catch(() => undefined);
        return { ok: false, reason: `The ${preset.label} preset could not fit this video.` };
      }
    }

    const message =
      preset.kind === "budget"
        ? `Compressed to ${bytes.byteLength} bytes, under the ${preset.label} limit.`
        : `Compressed to ${bytes.byteLength} bytes at ${preset.maxHeight}p.`;
    return { ok: true, name: "compressed.mp4", bytes, message };
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : "Compression failed.";
    return { ok: false, reason: message };
  } finally {
    ffmpeg.off("log", onLog);
    await ffmpeg.unmount(inputDir).catch(() => undefined);
    await ffmpeg.deleteFile(outputPath).catch(() => undefined);
  }
}
