import Stripe from "stripe";
import { PaymentsNotConfigured } from "./errors";

const clients = new Map<string, Stripe>();
const webhookFixtureKey = "sk_test_plainden_webhook_fixture";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentsNotConfigured();
  return clientFor(key);
}

export function getWebhookStripe(): Stripe {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentsNotConfigured();
  return clientFor(process.env.STRIPE_SECRET_KEY || webhookFixtureKey);
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentsNotConfigured();
  return secret;
}

function clientFor(key: string): Stripe {
  const existing = clients.get(key);
  if (existing) return existing;
  const stripe = new Stripe(key);
  clients.set(key, stripe);
  return stripe;
}
