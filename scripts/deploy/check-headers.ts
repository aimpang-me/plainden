import { readFileSync } from "node:fs";
import { vercelConfigHeaders } from "../../lib/security/csp.ts";
import { rateLimitFlag } from "../../lib/security/rateLimit.ts";

const parsed: unknown = JSON.parse(readFileSync("vercel.json", "utf8"));
const expected = { framework: "nextjs", headers: vercelConfigHeaders() };

if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
  console.error("vercel.json does not match securityHeaders production");
  process.exit(1);
}

if (rateLimitFlag.enforced !== false || rateLimitFlag.sharedStore !== false) {
  console.error("rate limit flag was switched on without a shared store");
  process.exit(1);
}

console.log("csp matches vercel.json");
console.log("rate limit enforced: false");
console.log("rate limit shared store: false");
