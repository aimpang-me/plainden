import { expect, test } from "vitest";
import { paddleMerchantSentence } from "./paddle";

test("the terms sentence matches the Paddle seller handbook", () => {
  expect(paddleMerchantSentence).toBe(
    "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.",
  );
  expect(paddleMerchantSentence).not.toMatch(/[—–]/);
});
