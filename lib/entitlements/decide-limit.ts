import { limitKinds, type LimitKind } from "../contract/limits";
import type { LimitDecision, LimitTable } from "../contract/types";

export function decideLimit(input: {
  plan: "free" | "paid";
  limits: { free: LimitTable; paid: LimitTable };
  kind: LimitKind;
  amount: number;
}): LimitDecision {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("amount must be a finite number that is >= 0");
  }
  if (!limitKinds.includes(input.kind)) {
    throw new Error(`unknown limit kind ${input.kind}`);
  }
  const table = input.plan === "paid" ? input.limits.paid : input.limits.free;
  const limit = table[input.kind];
  if (limit === undefined) return { ok: true };
  if (input.amount <= limit) return { ok: true };
  return {
    ok: false,
    limit,
    reason: `${input.plan} ${input.kind} allows ${limit}`,
  };
}
