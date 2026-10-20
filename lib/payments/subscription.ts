import type Stripe from "stripe";

export const subscriptionStatuses = ["incomplete", "trialing", "active", "past_due", "canceled", "unpaid"] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type SubscriptionFields = {
  userId: string;
  entitlementKey: string;
  priceLookupKey: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
};

export type SubscriptionApply =
  | { kind: "ignore" }
  | (SubscriptionFields & {
      kind: "insert-only" | "replace";
      status: SubscriptionStatus;
      currentPeriodEnd: Date | null;
    });

export function applyForEvent(event: Stripe.Event): SubscriptionApply {
  switch (event.type) {
    case "checkout.session.completed":
      return applyCheckout(event.data.object);
    case "customer.subscription.updated":
      return applySubscription(event.data.object, "replace");
    case "customer.subscription.deleted":
      return applyDeleted(event.data.object);
    case "invoice.payment_failed":
      return applyInvoiceFailed(event.data.object);
    default:
      return { kind: "ignore" };
  }
}

function applyCheckout(session: Stripe.Checkout.Session): SubscriptionApply {
  const stripeSubscriptionId = idOf(session.subscription);
  const fields = fieldsFrom(session.metadata, stripeSubscriptionId, idOf(session.customer));
  if (!fields) return { kind: "ignore" };
  return {
    kind: "insert-only",
    ...fields,
    status: "active",
    currentPeriodEnd: null,
  };
}

function applySubscription(
  subscription: Stripe.Subscription,
  kind: "replace",
): SubscriptionApply {
  const lookup = subscription.items.data[0]?.price.lookup_key ?? null;
  const metadata = {
    ...subscription.metadata,
    priceLookupKey: subscription.metadata.priceLookupKey || lookup || "",
  };
  const fields = fieldsFrom(metadata, subscription.id, idOf(subscription.customer));
  if (!fields) return { kind: "ignore" };
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    kind,
    ...fields,
    status: mapStatus(subscription.status),
    currentPeriodEnd: typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null,
  };
}

function applyDeleted(subscription: Stripe.Subscription): SubscriptionApply {
  const next = applySubscription(subscription, "replace");
  if (next.kind === "ignore") return next;
  return { ...next, kind: "replace", status: "canceled" };
}

function applyInvoiceFailed(invoice: Stripe.Invoice): SubscriptionApply {
  const details = invoice.parent?.subscription_details;
  const stripeSubscriptionId = details ? idOf(details.subscription) : null;
  const fields = fieldsFrom(details?.metadata ?? null, stripeSubscriptionId, idOf(invoice.customer));
  if (!fields) return { kind: "ignore" };
  return {
    kind: "replace",
    ...fields,
    status: "past_due",
    currentPeriodEnd: null,
  };
}

function fieldsFrom(
  metadata: Stripe.Metadata | null | undefined,
  stripeSubscriptionId: string | null,
  stripeCustomerId: string | null,
): SubscriptionFields | null {
  const userId = text(metadata, "userId");
  const entitlementKey = text(metadata, "entitlementKey");
  const priceLookupKey = text(metadata, "priceLookupKey");
  if (!userId || !entitlementKey || !priceLookupKey || !stripeSubscriptionId) return null;
  return { userId, entitlementKey, priceLookupKey, stripeCustomerId, stripeSubscriptionId };
}

function text(metadata: Stripe.Metadata | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.length > 0) return value.id;
  return null;
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
      return status;
    case "incomplete_expired":
    case "paused":
      return "unpaid";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}
