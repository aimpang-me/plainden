import type { Payments, WebhookInput, WebhookResult } from "./types";
import { createCheckout, createPortal } from "./checkout";
import { PaymentsNotConfigured, WebhookSignatureError } from "./errors";
import { persistSubscription } from "./persist";
import { getWebhookStripe, webhookSecret } from "./stripe-client";
import { applyForEvent } from "./subscription";

export { PaymentsNotConfigured, WebhookSignatureError, createCheckout, createPortal };

export const payments: Payments = {
  createCheckout,
  createPortal,
  handleWebhook,
};

export async function handleWebhook(input: WebhookInput): Promise<WebhookResult> {
  const stripe = getWebhookStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(input.rawBody, input.signature, webhookSecret());
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) throw error;
    throw new WebhookSignatureError();
  }
  const apply = applyForEvent(event);
  if (apply.kind !== "ignore") await persistSubscription(apply);
  return { handled: true };
}
