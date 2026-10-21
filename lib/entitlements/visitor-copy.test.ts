import { expect, test } from "vitest";
import type { LimitKind } from "../contract/limits";
import type { LimitDecision } from "../contract/types";
import { visitorLimitCopy, type LimitSubject } from "./visitor-copy";

type Denied = Extract<LimitDecision, { ok: false }>;

function denied(plan: "free" | "paid", kind: LimitKind, limit: number): Denied {
  return { ok: false, plan, kind, limit, reason: "internal" };
}

test("visitor copy names the plan in plain sentences", () => {
  const cases: Array<[LimitSubject, Denied, string]> = [
    ["invoice", denied("free", "savedItems", 0), "Saving invoices is part of the paid plan."],
    ["receipt", denied("free", "savedItems", 0), "Saving receipts is part of the paid plan."],
    ["qr", denied("free", "savedItems", 0), "Saving QR codes is part of the paid plan."],
    ["qr", denied("paid", "savedItems", 20), "The paid plan saves 20 QR codes."],
    ["policy", denied("free", "savedItems", 0), "Hosting a policy is part of the paid plan."],
    ["invoice", denied("free", "perMonth", 3), "The free plan includes 3 invoices a month."],
    ["receipt", denied("free", "perMonth", 3), "The free plan includes 3 receipts a month."],
    ["pdf", denied("free", "fileSize", 25 * 1024 * 1024), "The free plan allows files up to 25 MB."],
    ["pdf", denied("paid", "fileSize", 200 * 1024 * 1024), "The paid plan allows files up to 200 MB."],
    ["image", denied("free", "fileSize", 10 * 1024 * 1024), "The free plan allows files up to 10 MB."],
    ["video", denied("free", "fileSize", 100 * 1024 * 1024), "The free plan allows files up to 100 MB."],
    ["data", denied("free", "fileSize", 5 * 1024 * 1024), "The free plan allows files up to 5 MB."],
    ["pdf", denied("free", "perDay", 5), "The free plan allows 5 PDF runs a day."],
    ["image", denied("free", "batchCount", 10), "The free plan allows 10 images at a time."],
    ["image", denied("paid", "batchCount", 100), "The paid plan allows 100 images at a time."],
    ["subtitles", denied("free", "batchCount", 1), "The free plan converts one subtitle file at a time."],
    ["subtitles", denied("paid", "batchCount", 50), "The paid plan converts up to 50 subtitle files at a time."],
    ["pdf", denied("free", "fileSize", 1500), "The free plan allows files up to 1500 bytes."],
  ];
  for (const [subject, decision, sentence] of cases) {
    const copy = visitorLimitCopy(subject, decision);
    expect(copy).toBe(sentence);
    expect(copy).not.toMatch(/savedItems|fileSize|batchCount|perMonth|perDay|unknown entitlement|plainden_/);
  }
  expect(visitorLimitCopy("invoice", { plan: "free", kind: "unknown", limit: 0 })).toBe("This action is not available.");
});
