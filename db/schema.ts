import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  providerCustomerId: text("providerCustomerId").unique(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const subscription = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  entitlementKey: text("entitlementKey").notNull(),
  status: text("status").notNull(),
  priceLookupKey: text("priceLookupKey").notNull(),
  providerCustomerId: text("providerCustomerId"),
  providerSubscriptionId: text("providerSubscriptionId"),
  providerEventAt: timestamp("providerEventAt", { withTimezone: true, mode: "date" }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const usage = pgTable(
  "usage",
  {
    id: text("id").primaryKey(),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("deviceId"),
    entitlementKey: text("entitlementKey").notNull(),
    kind: text("kind").notNull(),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    check(
      "usage_one_subject",
      sql`(${table.userId} is not null and ${table.deviceId} is null) or (${table.userId} is null and ${table.deviceId} is not null)`,
    ),
  ],
);

export const savedInvoice = pgTable("saved_invoices", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const qrCode = pgTable("qr_codes", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetUrl: text("targetUrl").notNull(),
  scanCount: integer("scanCount").notNull().default(0),
  logoDataUrl: text("logoDataUrl"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const policyDoc = pgTable("policy_docs", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  publicId: text("publicId").notNull().unique(),
  body: text("body").notNull(),
  publishedAt: timestamp("publishedAt", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const processedEvent = pgTable("processed_events", {
  id: text("id").primaryKey(),
  occurredAt: timestamp("occurredAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const schema = {
  user,
  session,
  account,
  verification,
  subscription,
  processedEvent,
  usage,
  savedInvoice,
  qrCode,
  policyDoc,
};

export const tables = [
  user,
  session,
  account,
  verification,
  subscription,
  processedEvent,
  usage,
  savedInvoice,
  qrCode,
  policyDoc,
];
