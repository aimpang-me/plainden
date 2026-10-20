export type HeaderMode = "production" | "development";

export type SecurityHeader = {
  key: string;
  value: string;
};

const turnstile = "https://challenges.cloudflare.com";

function scriptSources(mode: HeaderMode): readonly string[] {
  switch (mode) {
    case "production":
      return ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "blob:", turnstile];
    case "development":
      return ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:", turnstile];
    default: {
      const unreachable: never = mode;
      throw new Error(`unknown header mode ${unreachable}`);
    }
  }
}

type Directive = {
  name: string;
  sources?: readonly string[];
};

function policy(mode: HeaderMode): string {
  const directives: readonly Directive[] = [
    { name: "default-src", sources: ["'self'"] },
    { name: "script-src", sources: scriptSources(mode) },
    { name: "style-src", sources: ["'self'", "'unsafe-inline'"] },
    { name: "img-src", sources: ["'self'", "blob:", "data:"] },
    { name: "font-src", sources: ["'self'"] },
    { name: "connect-src", sources: ["'self'", "blob:", turnstile] },
    { name: "media-src", sources: ["'self'", "blob:"] },
    { name: "worker-src", sources: ["'self'", "blob:"] },
    { name: "frame-src", sources: [turnstile] },
    { name: "object-src", sources: ["'none'"] },
    { name: "base-uri", sources: ["'self'"] },
    { name: "form-action", sources: ["'self'"] },
    { name: "frame-ancestors", sources: ["'none'"] },
    { name: "upgrade-insecure-requests" },
  ];
  return directives
    .map((directive) =>
      directive.sources ? `${directive.name} ${directive.sources.join(" ")}` : directive.name,
    )
    .join("; ");
}

export function contentSecurityPolicy(mode: HeaderMode = "production"): string {
  return policy(mode);
}

export function securityHeaders(mode: HeaderMode = "production"): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(mode) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}

export function vercelConfigHeaders(): { source: string; headers: SecurityHeader[] }[] {
  return [{ source: "/(.*)", headers: securityHeaders("production") }];
}
