export async function encodeJpegWithCanvas(jpeg: Uint8Array): Promise<Uint8Array | null> {
  try {
    const bytes = new Uint8Array(jpeg);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0);
      const encoded = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((next) => resolve(next), "image/jpeg", 0.5);
      });
      if (!encoded) return null;
      return new Uint8Array(await encoded.arrayBuffer());
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
