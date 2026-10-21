import { expect, test } from "vitest";
import { amountFor, bundlePlan, lookupKeyFor, pricesToCreate, singleToolPlans } from "./catalog";

test("visitor plans cover every paid lookup key", () => {
  const plans = [...singleToolPlans(), bundlePlan()];
  const keys = plans.flatMap((plan) => [lookupKeyFor(plan, "month"), lookupKeyFor(plan, "year")]);
  expect(new Set(keys)).toEqual(new Set(pricesToCreate().map((price) => price.lookupKey)));
  expect(keys).toHaveLength(18);
  expect(plans.map((plan) => plan.name).some((name) => name.includes("plainden_"))).toBe(false);
});

test("one tool is $5 and $50, and all tools is $9 and $90", () => {
  for (const plan of singleToolPlans()) {
    expect(amountFor(plan, "month")).toBe(500);
    expect(amountFor(plan, "year")).toBe(5000);
  }
  const bundle = bundlePlan();
  expect(amountFor(bundle, "month")).toBe(900);
  expect(amountFor(bundle, "year")).toBe(9000);
  expect(lookupKeyFor(bundle, "year")).toBe("plainden_all_year");
});
