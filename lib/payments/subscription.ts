import { priceByLookupKey } from "../pricing/catalog";
import type { BillingInterval } from "../pricing/catalog";
import { parseInstant, record, text } from "./json";

export const subscriptionStatuses = ["incomplete", "trialing", "active", "past_due", "canceled", "unpaid", "paused"] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type ScheduledCancel =
  | { kind: "unchanged" }
  | { kind: "clear" }
  | { kind: "cancel"; effectiveAt: Date };

export type SubscriptionApply =
  | { kind: "ignore" }
  | {
      kind: "insert-only" | "replace";
      eventId: string;
      eventAt: Date;
      status: SubscriptionStatus;
      currentPeriodEnd: Date | null;
      providerSubscriptionId: string;
      providerCustomerId: string | null;
      userId: string | null;
      entitlementKey: string | null;
      priceLookupKey: string | null;
      scheduledCancel: ScheduledCancel;
    };

export type PaddleNotification = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: unknown;
};

const subscriptionEvents = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
]);

export function applyForNotification(event: PaddleNotification): SubscriptionApply {
  const data = record(event.data);
  if (!data) return { kind: "ignore" };
  const body = applyBody(event.event_type ?? "", data);
  if (body.kind === "ignore") return body;
  if (!event.event_id) return { kind: "ignore" };
  return { ...body, eventId: event.event_id, eventAt: eventAt(event.occurred_at) };
}

export function paddlePriceEnv(interval: BillingInterval): "PADDLE_PRICE_MONTHLY" | "PADDLE_PRICE_YEARLY" {
  switch (interval) {
    case "month":
      return "PADDLE_PRICE_MONTHLY";
    case "year":
      return "PADDLE_PRICE_YEARLY";
    default: {
      const unreachable: never = interval;
      return unreachable;
    }
  }
}

type ApplyBody = Omit<Exclude<SubscriptionApply, { kind: "ignore" }>, "eventId" | "eventAt">;

function applyBody(eventType: string, data: Record<string, unknown>): ApplyBody | { kind: "ignore" } {
  if (eventType === "transaction.completed") return applyTransaction(data);
  if (eventType === "adjustment.created" || eventType === "adjustment.updated") return applyAdjustment(data);
  if (!subscriptionEvents.has(eventType)) return { kind: "ignore" };
  return applySubscription(eventType, data);
}

function applyTransaction(data: Record<string, unknown>): ApplyBody | { kind: "ignore" } {
  const fields = fieldsFrom(data, text(data, "subscription_id"));
  if (!fields) return { kind: "ignore" };
  return {
    kind: "insert-only",
    ...fields,
    status: "active",
    currentPeriodEnd: periodEnd(data.billing_period),
    scheduledCancel: { kind: "unchanged" },
  };
}

function applySubscription(eventType: string, data: Record<string, unknown>): ApplyBody | { kind: "ignore" } {
  const providerSubscriptionId = text(data, "id");
  const status = statusFor(eventType, text(data, "status"));
  if (!providerSubscriptionId || !status) return { kind: "ignore" };
  const fields = fieldsFrom(data, providerSubscriptionId);
  return {
    kind: "replace",
    status,
    currentPeriodEnd: periodEnd(data.current_billing_period),
    providerSubscriptionId,
    providerCustomerId: fields?.providerCustomerId ?? text(data, "customer_id"),
    userId: fields?.userId ?? null,
    entitlementKey: fields?.entitlementKey ?? null,
    priceLookupKey: fields?.priceLookupKey ?? null,
    scheduledCancel: scheduledCancelFrom(data),
  };
}

function applyAdjustment(data: Record<string, unknown>): ApplyBody | { kind: "ignore" } {
  const providerSubscriptionId = text(data, "subscription_id");
  if (!providerSubscriptionId || text(data, "status") !== "approved" || !revokesAccess(data)) return { kind: "ignore" };
  return {
    kind: "replace",
    status: "canceled",
    currentPeriodEnd: null,
    providerSubscriptionId,
    providerCustomerId: text(data, "customer_id"),
    userId: null,
    entitlementKey: null,
    priceLookupKey: null,
    scheduledCancel: { kind: "clear" },
  };
}

function revokesAccess(adjustment: Record<string, unknown>): boolean {
  const action = text(adjustment, "action");
  if (action === "chargeback") return true;
  return action === "refund" && text(adjustment, "type") === "full";
}

function scheduledCancelFrom(data: Record<string, unknown>): ScheduledCancel {
  if (!Object.hasOwn(data, "scheduled_change")) return { kind: "unchanged" };
  const change = record(data.scheduled_change);
  const action = text(change, "action");
  const effectiveAt = parseInstant(text(change, "effective_at"));
  if (action === "cancel" && effectiveAt) return { kind: "cancel", effectiveAt };
  return { kind: "clear" };
}

function fieldsFrom(
  data: Record<string, unknown>,
  providerSubscriptionId: string | null,
): {
  userId: string;
  entitlementKey: string;
  priceLookupKey: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string;
} | null {
  const custom = record(data.custom_data);
  const userId = text(custom, "userId");
  const priceLookupKey = text(custom, "priceLookupKey");
  if (!userId || !providerSubscriptionId || !priceLookupKey) return null;
  const price = priceByLookupKey(priceLookupKey);
  if (!price || price.amountCents <= 0) return null;
  return {
    userId,
    entitlementKey: price.entitlementKey,
    priceLookupKey,
    providerCustomerId: text(data, "customer_id"),
    providerSubscriptionId,
  };
}

function statusFor(eventType: string, raw: string | null): SubscriptionStatus | null {
  switch (eventType) {
    case "subscription.canceled":
      return "canceled";
    case "subscription.past_due":
      return "past_due";
    case "subscription.activated":
    case "subscription.resumed":
      return "active";
    case "subscription.paused":
      return "paused";
    case "subscription.created":
      return mapStatus(raw) === "trialing" ? "trialing" : null;
    case "subscription.updated":
      return mapStatus(raw);
    default:
      return null;
  }
}

function mapStatus(status: string | null): SubscriptionStatus | null {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "paused":
      return status;
    case "incomplete_expired":
      return "incomplete";
    default:
      return null;
  }
}

function periodEnd(value: unknown): Date | null {
  return parseInstant(text(record(value), "ends_at"));
}

function eventAt(value: string | undefined): Date {
  return parseInstant(value ?? null) ?? new Date(0);
}
