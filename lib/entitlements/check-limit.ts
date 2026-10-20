import type { LimitDecision, Subject } from "../contract/types";
import type { LimitKind } from "../contract/limits";
import { decideLimit } from "./decide-limit";
import { getEntitlement } from "./get-entitlement";
import { limitsFor } from "./limits-for";

export async function checkLimit(
  subject: Subject,
  entitlementKey: string,
  kind: LimitKind,
  amount: number,
): Promise<LimitDecision> {
  const limits = limitsFor(entitlementKey);
  if (!limits) return { ok: false, limit: 0, reason: `unknown entitlement ${entitlementKey}` };
  const entitlement = await getEntitlement(subject, entitlementKey);
  return decideLimit({ plan: entitlement.plan, limits, kind, amount });
}
