import { execFileSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vitest/config";

execFileSync(process.execPath, ["--experimental-strip-types", "scripts/gen-registry.ts"], {
  stdio: "inherit",
});

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
