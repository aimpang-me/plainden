export class PaymentsNotConfigured extends Error {
  constructor() {
    super("Payments are not configured");
    this.name = "PaymentsNotConfigured";
  }
}

export class WebhookSignatureError extends Error {
  constructor() {
    super("Invalid Paddle webhook signature");
    this.name = "WebhookSignatureError";
  }
}

export class WebhookDeferred extends Error {
  constructor() {
    super("Webhook arrived before its subscription. Retry later.");
    this.name = "WebhookDeferred";
  }
}

export type CheckoutErrorCode =
  | "off"
  | "no-user"
  | "unknown-price"
  | "site-url"
  | "already-subscribed"
  | "open-checkout"
  | "no-customer"
  | "no-subscription"
  | "upstream";

export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

const checkoutCopy: Record<CheckoutErrorCode, string> = {
  off: "Checkout is turned off.",
  "no-user": "Sign in to buy a plan.",
  "unknown-price": "That plan is not available.",
  "site-url": "Checkout could not start.",
  "already-subscribed": "You already have a subscription. Manage billing to change it.",
  "open-checkout": "Finish or cancel your open checkout first.",
  "no-customer": "No billing account yet.",
  "no-subscription": "No active subscription.",
  upstream: "Checkout could not start. Try again.",
};

export function checkoutErrorCopy(error: unknown): string {
  if (error instanceof PaymentsNotConfigured) return "Payments are not configured.";
  if (error instanceof CheckoutError) return checkoutCopy[error.code];
  return "Checkout could not start.";
}
