export type HeaderMode = "production" | "development";

export type SecurityHeader = {
  key: string;
  value: string;
};

const turnstile = "https://challenges.cloudflare.com";
const paddleScript = "https://cdn.paddle.com";
const sandboxCdn = "https://sandbox-cdn.paddle.com";
const paddleConnect = [
  "https://cdn.paddle.com",
  "https://sandbox-api.paddle.com",
  "https://api.paddle.com",
  "https://sandbox-checkout-service.paddle.com",
  "https://checkout-service.paddle.com",
] as const;
const paddleFrames = ["https://sandbox-buy.paddle.com", "https://buy.paddle.com"] as const;

function scriptSources(mode: HeaderMode): readonly string[] {
  switch (mode) {
    case "production":
      return paddleSources(["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "blob:", turnstile, paddleScript]);
    case "development":
      return paddleSources(["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:", turnstile, paddleScript]);
    default: {
      const unreachable: never = mode;
      throw new Error(`unknown header mode ${unreachable}`);
    }
  }
}

function paddleSources(sources: readonly string[]): readonly string[] {
  if (process.env.NEXT_PUBLIC_PADDLE_ENV !== "sandbox") return sources;
  return sources.flatMap((source) => (source === paddleScript ? [source, sandboxCdn] : [source]));
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
    { name: "connect-src", sources: paddleSources(["'self'", "blob:", turnstile, ...paddleConnect]) },
    { name: "media-src", sources: ["'self'", "blob:"] },
    { name: "worker-src", sources: ["'self'", "blob:"] },
    { name: "frame-src", sources: [turnstile, ...paddleFrames] },
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

const permissionsPolicy = "camera=(), microphone=(), geolocation=()";

export function securityHeaders(mode: HeaderMode = "production"): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(mode) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: permissionsPolicy },
  ];
  if (mode === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}
