import { afterEach, expect, test, vi } from "vitest";
import { openPaddleCheckout } from "./paddle-checkout";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("Paddle checkout opens with the signed-in email", async () => {
  const opened: unknown[] = [];
  vi.stubGlobal("window", {
    Paddle: {
      Environment: { set: () => undefined },
      Initialize: () => undefined,
      Checkout: {
        open: (options: unknown) => {
          opened.push(options);
        },
      },
    },
    location: { origin: "https://plainden.test" },
  });
  vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_token_plainden");
  vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "sandbox");
  await openPaddleCheckout("txn_1", "ada@example.com");
  expect(opened).toEqual([
    {
      transactionId: "txn_1",
      customer: { email: "ada@example.com" },
      settings: { successUrl: "https://plainden.test/account?checkout=pending" },
    },
  ]);
});
