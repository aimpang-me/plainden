import type { Subject } from "../contract/types";

export type CheckoutInput = {
  priceLookupKey: string;
  subject: Subject;
  successPath: string;
  cancelPath: string;
};

export type CheckoutResult = {
  transactionId: string;
};

export type PortalInput = {
  subject: Subject;
  returnPath: string;
};

export type PortalResult = {
  url: string;
};

export type WebhookInput = {
  rawBody: string;
  signature: string;
};

export type WebhookResult = {
  handled: true;
};

export type Payments = {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  createPortal(input: PortalInput): Promise<PortalResult>;
  handleWebhook(input: WebhookInput): Promise<WebhookResult>;
};
