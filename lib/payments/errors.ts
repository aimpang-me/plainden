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
