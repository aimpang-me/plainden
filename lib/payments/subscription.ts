import { priceByLookupKey } from "../pricing/catalog";
import type { BillingInterval } from "../pricing/catalog";

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

const revokeActions = new Set(["refund", "chargeback"]);

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
  const action = text(data, "action");
  const providerSubscriptionId = text(data, "subscription_id");
  if (!providerSubscriptionId || !action || !revokeActions.has(action) || text(data, "status") !== "approved") {
    return { kind: "ignore" };
  }
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

function scheduledCancelFrom(data: Record<string, unknown>): ScheduledCancel {
  if (!Object.hasOwn(data, "scheduled_change")) return { kind: "unchanged" };
  const change = record(data.scheduled_change);
  const action = change ? text(change, "action") : null;
  const effectiveAt = change ? instant(text(change, "effective_at")) : null;
  if (action === "cancel" && effectiveAt) return { kind: "cancel", effectiveAt };
  return { kind: "clear" };
}

function instant(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const userId = custom ? text(custom, "userId") : null;
  const priceLookupKey = custom ? text(custom, "priceLookupKey") : null;
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
  const period = record(value);
  const ends = period ? text(period, "ends_at") : null;
  if (!ends) return null;
  const date = new Date(ends);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventAt(value: string | undefined): Date {
  if (!value) return new Date(0);
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : new Date(0);
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
