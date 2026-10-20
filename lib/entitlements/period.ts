import { LimitKind, type LimitKind as LimitKindValue } from "../contract/limits";

export function usagePeriod(kind: LimitKindValue, at: Date): string | null {
  switch (kind) {
    case LimitKind.perDay:
      return at.toISOString().slice(0, 10);
    case LimitKind.perMonth:
      return at.toISOString().slice(0, 7);
    case LimitKind.savedItems:
      return "lifetime";
    case LimitKind.fileSize:
    case LimitKind.batchCount:
      return null;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
