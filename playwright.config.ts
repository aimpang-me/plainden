import { defineConfig, devices } from "@playwright/test";
import { dataDir, mailDir, origin, port } from "./e2e/env";

const ci = process.env.CI === "true";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: ci ? 1 : 2,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev --port ${port}`,
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(port),
      BETTER_AUTH_URL: origin,
      DEV_MAIL_DIR: mailDir,
      PGLITE_DATA_DIR: dataDir,
      STRIPE_SECRET_KEY: "sk_test_plainden_webhook_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_plainden_e2e",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
