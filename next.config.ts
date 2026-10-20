import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

execFileSync(process.execPath, ["--experimental-strip-types", "scripts/gen-registry.ts"], {
  stdio: "inherit",
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["@electric-sql/pglite", "resend"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
