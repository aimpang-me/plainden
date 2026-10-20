import type {
  CheckoutInput,
  CheckoutResult,
  Payments,
  PortalInput,
  PortalResult,
  WebhookInput,
  WebhookResult,
} from "./types";

export class PaymentsNotConfigured extends Error {
  constructor() {
    super("Payments are not configured");
    this.name = "PaymentsNotConfigured";
  }
}

export const payments: Payments = {
  createCheckout,
  createPortal,
  handleWebhook,
};

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  void input;
  throw new PaymentsNotConfigured();
}

export async function createPortal(input: PortalInput): Promise<PortalResult> {
  void input;
  throw new PaymentsNotConfigured();
}

export async function handleWebhook(input: WebhookInput): Promise<WebhookResult> {
  void input;
  throw new PaymentsNotConfigured();
}
