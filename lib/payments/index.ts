import type { Payments, WebhookInput, WebhookResult } from "./types";
import { createCheckout, createPortal } from "./checkout";
import { PaymentsNotConfigured, WebhookSignatureError } from "./errors";
import { persistSubscription } from "./persist";
import { assertPaddleSignature } from "./signature";
import { applyForNotification, type PaddleNotification } from "./subscription";

export { PaymentsNotConfigured, WebhookSignatureError, createCheckout, createPortal };

export const payments: Payments = {
  createCheckout,
  createPortal,
  handleWebhook,
};

export async function handleWebhook(input: WebhookInput): Promise<WebhookResult> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentsNotConfigured();
  assertPaddleSignature(input.rawBody, input.signature, secret);
  const event = JSON.parse(input.rawBody) as PaddleNotification;
  const apply = applyForNotification(event);
  if (apply.kind !== "ignore") await persistSubscription(apply);
  return { handled: true };
}
