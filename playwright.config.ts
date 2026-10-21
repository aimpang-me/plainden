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
      PADDLE_API_KEY: "pdl_test_plainden_e2e",
      PADDLE_WEBHOOK_SECRET: "pdl_whsec_plainden_e2e",
      PADDLE_PRICE_MONTHLY: "pri_month_e2e",
      PADDLE_PRICE_YEARLY: "pri_year_e2e",
      NEXT_PUBLIC_PADDLE_ENV: "sandbox",
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_token_plainden_e2e",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
