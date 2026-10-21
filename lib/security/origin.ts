export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return allowedOrigins().has(trimSlash(origin));
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
