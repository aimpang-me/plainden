import { expect, test } from "vitest";
import { getCurrentUser } from "../auth/get-current-user";
import { createCheckout, createPortal, handleWebhook } from "./index";

const subject = { userId: "user_1" } as const;

test("payment calls fail closed until Paddle is configured", async () => {
  await expect(
    createCheckout({
      priceLookupKey: "plainden_pdf_month",
      subject,
      successPath: "/pricing",
      cancelPath: "/pricing",
    }),
  ).rejects.toThrow("Payments are not configured");
  await expect(createPortal({ subject, returnPath: "/pricing" })).rejects.toThrow("Payments are not configured");
  await expect(handleWebhook({ rawBody: "{}", signature: "test" })).rejects.toThrow("Payments are not configured");
});

test("there is no signed-in user yet", async () => {
  expect(await getCurrentUser()).toBeNull();
});
