import { expect, test } from "vitest";
import { readEntitlementPayload } from "./entitlement-payload";

test("a paid payload for the asked key is paid and every other payload is free", () => {
  expect(readEntitlementPayload({ entitlementKey: "invoice", plan: "paid" }, "invoice")).toEqual({
    entitlementKey: "invoice",
    plan: "paid",
  });
  expect(readEntitlementPayload({ entitlementKey: "invoice", plan: "free" }, "invoice")).toEqual({
    entitlementKey: "invoice",
    plan: "free",
  });
  expect(readEntitlementPayload({ entitlementKey: "qr", plan: "paid" }, "invoice")).toEqual({
    entitlementKey: "invoice",
    plan: "free",
  });
  expect(readEntitlementPayload(null, "invoice")).toEqual({ entitlementKey: "invoice", plan: "free" });
});
