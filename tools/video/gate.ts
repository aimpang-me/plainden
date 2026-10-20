import { LimitKind } from "../../lib/contract/limits";
import type { LimitDecision } from "../../lib/contract/types";
import { decideLimit } from "../../lib/entitlements/decide-limit";
import { config } from "./config";

export function gateVideo(plan: "free" | "paid", bytes: number): LimitDecision {
  return decideLimit({
    plan,
    limits: config.limits,
    kind: LimitKind.fileSize,
    amount: bytes,
  });
}
