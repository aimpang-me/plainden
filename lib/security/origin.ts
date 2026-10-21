const qrWriteLimit = 300_000;
const invoiceWriteLimit = 400_000;

export { invoiceWriteLimit, qrWriteLimit };

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return allowedOrigins().has(trimSlash(origin));
}

const policyWriteLimit = 64_000;

export { policyWriteLimit };

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

function allowedOrigins(): Set<string> {
  const configured = [process.env.NEXT_PUBLIC_SITE_URL, process.env.BETTER_AUTH_URL];
  const values = ["https://plainden.com", "https://www.plainden.com", ...configured];
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT ?? "3100";
    values.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
  }
  return new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0).map(trimSlash));
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
