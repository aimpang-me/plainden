import { readFileSync } from "node:fs";
import { securityHeaders } from "../../lib/security/csp.ts";

const parsed: unknown = JSON.parse(readFileSync("vercel.json", "utf8"));

if (JSON.stringify(parsed) !== JSON.stringify({ framework: "nextjs" })) {
  console.error("vercel.json must not duplicate the CSP. proxy.ts is the only header source");
  process.exit(1);
}

const production = securityHeaders("production");
const csp = production.find((header) => header.key === "Content-Security-Policy");
const hsts = production.find((header) => header.key === "Strict-Transport-Security");
const permissions = production.find((header) => header.key === "Permissions-Policy");

if (!csp || !hsts || !permissions) {
  console.error("production security headers are missing CSP, HSTS, or Permissions-Policy");
  process.exit(1);
}

console.log("csp source: proxy.ts");
console.log("hsts: present");
console.log("permissions-policy: present");
