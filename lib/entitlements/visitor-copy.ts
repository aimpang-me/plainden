import type { LimitKind } from "../contract/limits";

type Plan = "free" | "paid";

export type LimitSubject =
  | "invoice"
  | "receipt"
  | "qr"
  | "policy"
  | "scaffold"
  | "pdf"
  | "image"
  | "video"
  | "data"
  | "subtitles";

type CopyInput = {
  plan: Plan;
  kind: LimitKind | "unknown";
  limit: number;
};

type Sentence = (plan: Plan, limit: number) => string;

const defaults: Record<LimitKind, Sentence> = {
  savedItems: (plan, limit) => `The ${plan} plan saves ${limit} items.`,
  perMonth: (plan, limit) => `The ${plan} plan allows ${limit} a month.`,
  fileSize: (plan, limit) => `The ${plan} plan allows files up to ${sizeLabel(limit)}.`,
  perDay: (plan, limit) => `The ${plan} plan allows ${limit} runs a day.`,
  batchCount: (plan, limit) => `The ${plan} plan allows ${limit} at a time.`,
};

const overrides: Partial<Record<LimitKind, Partial<Record<LimitSubject, Sentence>>>> = {
  savedItems: {
    invoice: (plan, limit) =>
      limit === 0 ? "Saving invoices is part of the paid plan." : `The ${plan} plan saves ${limit} invoices.`,
    receipt: (plan, limit) =>
      limit === 0 ? "Saving receipts is part of the paid plan." : `The ${plan} plan saves ${limit} receipts.`,
    qr: (plan, limit) =>
      limit === 0 ? "Saving QR codes is part of the paid plan." : `The ${plan} plan saves ${limit} QR codes.`,
    policy: (plan, limit) =>
      limit === 0 ? "Hosting a policy is part of the paid plan." : `The ${plan} plan hosts ${limit} policies.`,
  },
  perMonth: {
    invoice: (plan, limit) => `The ${plan} plan includes ${limit} invoices a month.`,
    receipt: (plan, limit) => `The ${plan} plan includes ${limit} receipts a month.`,
    scaffold: (plan, limit) => `The ${plan} plan allows a count of ${limit}.`,
  },
  perDay: {
    pdf: (plan, limit) => `The ${plan} plan allows ${limit} PDF runs a day.`,
  },
  batchCount: {
    image: (plan, limit) => `The ${plan} plan allows ${limit} images at a time.`,
    subtitles: (plan, limit) =>
      limit === 1
        ? `The ${plan} plan converts one subtitle file at a time.`
        : `The ${plan} plan converts up to ${limit} subtitle files at a time.`,
  },
};

export function visitorLimitCopy(subject: LimitSubject, decision: CopyInput): string {
  if (decision.kind === "unknown") return "This action is not available.";
  const sentence = overrides[decision.kind]?.[subject] ?? defaults[decision.kind];
  return sentence(decision.plan, decision.limit);
}

function sizeLabel(bytes: number): string {
  const mb = 1024 * 1024;
  if (bytes % mb === 0) return `${bytes / mb} MB`;
  return `${bytes} bytes`;
}
