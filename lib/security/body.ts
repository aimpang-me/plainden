export const qrWriteLimit = 300_000;
export const invoiceWriteLimit = 400_000;
export const policyWriteLimit = 64_000;

export async function readLimitedBody(
  request: Request,
  limit: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) return { ok: false };
    if (Number(declared) > limit) return { ok: false };
  }
  const body = request.body;
  if (!body) return { ok: true, text: "" };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    total += step.value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(step.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

export function parseJsonBody(text: string): unknown {
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
