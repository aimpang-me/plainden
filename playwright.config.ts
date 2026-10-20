import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npx next dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      STRIPE_SECRET_KEY: "sk_test_plainden_webhook_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_plainden_e2e",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
