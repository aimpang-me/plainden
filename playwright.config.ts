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
