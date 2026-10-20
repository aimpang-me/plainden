import { expect, test } from "vitest";
import { GET } from "./route";

test("a signed-out entitlement read is the free plan", async () => {
  const response = await GET(new Request("http://127.0.0.1/api/entitlement?key=invoice"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ entitlementKey: "invoice", plan: "free" });
});

test("an entitlement read without a key is rejected", async () => {
  const response = await GET(new Request("http://127.0.0.1/api/entitlement"));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid", message: "key is required" });
});
