import type { LimitKind } from "../contract/limits";
import type { LimitDecision } from "../contract/types";

export type LimitSubject =
  | "invoice"
  | "receipt"
  | "qr"
  | "policy"
  | "pdf"
  | "image"
  | "video"
  | "data"
  | "subtitles";

type Denied = Extract<LimitDecision, { ok: false }>;
type Plan = "free" | "paid";

export function visitorLimitCopy(subject: LimitSubject, decision: Denied): string {
  if (decision.kind === "unknown") return "This action is not available.";
  return copyFor(subject, decision.plan, decision.kind, decision.limit);
}

function copyFor(subject: LimitSubject, plan: Plan, kind: LimitKind, limit: number): string {
  switch (kind) {
    case "savedItems":
      return savedCopy(subject, plan, limit);
    case "perMonth":
      return monthCopy(subject, plan, limit);
    case "fileSize":
      return `The ${plan} plan allows files up to ${sizeLabel(limit)}.`;
    case "perDay":
      return dayCopy(subject, plan, limit);
    case "batchCount":
      return batchCopy(subject, plan, limit);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function savedCopy(subject: LimitSubject, plan: Plan, limit: number): string {
  switch (subject) {
    case "invoice":
      return limit === 0 ? "Saving invoices is part of the paid plan." : `The ${plan} plan saves ${limit} invoices.`;
    case "receipt":
      return limit === 0 ? "Saving receipts is part of the paid plan." : `The ${plan} plan saves ${limit} receipts.`;
    case "qr":
      return limit === 0 ? "Saving QR codes is part of the paid plan." : `The ${plan} plan saves ${limit} QR codes.`;
    case "policy":
      return limit === 0 ? "Hosting a policy is part of the paid plan." : `The ${plan} plan hosts ${limit} policies.`;
    case "pdf":
    case "image":
    case "video":
    case "data":
    case "subtitles":
      return `The ${plan} plan saves ${limit} items.`;
    default: {
      const unreachable: never = subject;
      return unreachable;
    }
  }
}

function monthCopy(subject: LimitSubject, plan: Plan, limit: number): string {
  switch (subject) {
    case "invoice":
      return `The ${plan} plan includes ${limit} invoices a month.`;
    case "receipt":
      return `The ${plan} plan includes ${limit} receipts a month.`;
    case "qr":
    case "policy":
    case "pdf":
    case "image":
    case "video":
    case "data":
    case "subtitles":
      return `The ${plan} plan allows ${limit} a month.`;
    default: {
      const unreachable: never = subject;
      return unreachable;
    }
  }
}

function dayCopy(subject: LimitSubject, plan: Plan, limit: number): string {
  switch (subject) {
    case "pdf":
      return `The ${plan} plan allows ${limit} PDF runs a day.`;
    case "invoice":
    case "receipt":
    case "qr":
    case "policy":
    case "image":
    case "video":
    case "data":
    case "subtitles":
      return `The ${plan} plan allows ${limit} runs a day.`;
    default: {
      const unreachable: never = subject;
      return unreachable;
    }
  }
}

function batchCopy(subject: LimitSubject, plan: Plan, limit: number): string {
  switch (subject) {
    case "image":
      return `The ${plan} plan allows ${limit} images at a time.`;
    case "subtitles":
      return limit === 1
        ? `The ${plan} plan converts one subtitle file at a time.`
        : `The ${plan} plan converts up to ${limit} subtitle files at a time.`;
    case "invoice":
    case "receipt":
    case "qr":
    case "policy":
    case "pdf":
    case "video":
    case "data":
      return `The ${plan} plan allows ${limit} at a time.`;
    default: {
      const unreachable: never = subject;
      return unreachable;
    }
  }
}

function sizeLabel(bytes: number): string {
  const mb = 1024 * 1024;
  if (bytes % mb === 0) return `${bytes / mb} MB`;
  return `${bytes} bytes`;
}
