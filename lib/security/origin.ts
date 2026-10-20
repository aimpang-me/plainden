const qrWriteLimit = 300_000;
const invoiceWriteLimit = 400_000;

export { invoiceWriteLimit, qrWriteLimit };

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return allowedOrigins().has(trimSlash(origin));
}

export async function readLimitedBody(
  request: Request,
  limit: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const text = await request.text();
  if (text.length > limit) return { ok: false };
  return { ok: true, text };
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
  const port = process.env.PORT ?? "3100";
  const configured = [process.env.NEXT_PUBLIC_SITE_URL, process.env.BETTER_AUTH_URL];
  const values = [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    "https://plainden.com",
    "https://www.plainden.com",
    ...configured,
  ];
  return new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0).map(trimSlash));
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
