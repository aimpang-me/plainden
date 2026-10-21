import type { Payments, WebhookInput, WebhookResult } from "./types";
import { createCheckout, createPortal } from "./checkout";
import { CheckoutError, PaymentsNotConfigured, WebhookDeferred, WebhookSignatureError, checkoutErrorCopy } from "./errors";
import { persistSubscription } from "./persist";
import { assertPaddleSignature } from "./signature";
import { applyForNotification, type PaddleNotification } from "./subscription";

export {
  CheckoutError,
  PaymentsNotConfigured,
  WebhookDeferred,
  WebhookSignatureError,
  checkoutErrorCopy,
  createCheckout,
  createPortal,
};

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
  if (apply.kind === "ignore") return { handled: true };
  if ((await persistSubscription(apply)) === "deferred") throw new WebhookDeferred();
  return { handled: true };
}
