import type { ImageEncoder } from "./engine";

async function openBitmap(bytes: Uint8Array): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(new Blob([new Uint8Array(bytes)]));
  } catch {
    return null;
  }
}

export const canvasEncoder: ImageEncoder = {
  async measure(bytes) {
    const bitmap = await openBitmap(bytes);
    if (!bitmap) return null;
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  },
  async encode(request) {
    const bitmap = await openBitmap(request.bytes);
    if (!bitmap) return null;
    try {
      const width = Math.max(1, Math.round(bitmap.width * request.scale));
      const height = Math.max(1, Math.round(bitmap.height * request.scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((next) => resolve(next), request.output, request.quality);
      });
      if (!blob) return null;
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
    } finally {
      bitmap.close();
    }
  },
};
