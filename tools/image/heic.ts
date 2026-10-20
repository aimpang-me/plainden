import type { ImageRun } from "./engine";

const brands = new Set(["heic", "heix", "hevc", "mif1"]);

function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const kind = String.fromCharCode(bytes[4] ?? 0, bytes[5] ?? 0, bytes[6] ?? 0, bytes[7] ?? 0);
  if (kind !== "ftyp") return false;
  const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0);
  return brands.has(brand);
}

function jpgName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.jpg`;
}

export async function heicTransform(files: readonly { name: string; bytes: Uint8Array }[]): Promise<ImageRun> {
  const loaded = await import("heic-to/csp");
  const produced: { name: string; bytes: Uint8Array; mime: "image/jpeg" }[] = [];
  for (const file of files) {
    if (!isHeic(file.bytes)) return { ok: false, reason: `${file.name} is not a HEIC image.`, limit: false };
    try {
      const bytes = Uint8Array.from(file.bytes);
      const jpeg = await loaded.heicTo({
        blob: new Blob([bytes]),
        type: "image/jpeg",
        quality: 0.92,
      });
      produced.push({ name: jpgName(file.name), bytes: new Uint8Array(await jpeg.arrayBuffer()), mime: "image/jpeg" });
    } catch {
      return { ok: false, reason: `${file.name} could not be converted.`, limit: false };
    }
  }
  const noun = produced.length === 1 ? "HEIC image" : "HEIC images";
  return { ok: true, files: produced, note: `Converted ${produced.length} ${noun} to JPG.` };
}
