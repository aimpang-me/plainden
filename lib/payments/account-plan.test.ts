import { expect, test } from "vitest";
import { accountPlanCopy } from "./account-plan";

const now = new Date("2026-10-21T00:00:00.000Z");

test("an all-tools subscription is All tools and a single tool names that tool", () => {
  expect(
    accountPlanCopy(
      [{ entitlementKey: "all", status: "active", currentPeriodEnd: null, cancelAt: null }],
      now,
    ),
  ).toEqual({ plan: "All tools", ends: null });
  expect(
    accountPlanCopy(
      [{ entitlementKey: "pdf", status: "active", currentPeriodEnd: null, cancelAt: null }],
      now,
    ),
  ).toEqual({ plan: "Pro: Merge PDF", ends: null });
  expect(accountPlanCopy([], now)).toEqual({ plan: "Free", ends: null });
});

test("a scheduled cancel says when Pro ends", () => {
  expect(
    accountPlanCopy(
      [
        {
          entitlementKey: "all",
          status: "active",
          currentPeriodEnd: new Date("2026-11-21T00:00:00.000Z"),
          cancelAt: new Date("2026-11-21T00:00:00.000Z"),
        },
      ],
      now,
    ),
  ).toEqual({ plan: "All tools", ends: "Pro ends November 21, 2026" });
});
