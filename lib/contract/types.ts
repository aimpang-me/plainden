import type { ComponentType } from "react";
import type { LimitKind } from "./limits";

export type LimitTable = Partial<Record<LimitKind, number>>;

export type ToolConfig = {
  id: string;
  name: string;
  slugs: readonly string[];
  title: string;
  description: string;
  entitlementKey: string;
  priceLookupKey: string;
  limits: { free: LimitTable; paid: LimitTable };
  seoPages: readonly string[];
};

export type ToolProps = {
  slug: string;
  preset?: string;
};

export type ToolComponent = ComponentType<ToolProps>;

export type Faq = {
  question: string;
  answer: string;
};

export type LongTailPage = {
  slug: string;
  title: string;
  intro: string;
  preset?: string;
  faq: readonly Faq[];
};

export type ToolCopy = {
  headline: string;
  steps: readonly string[];
  faq: readonly Faq[];
  longTail: readonly LongTailPage[];
};

export type Subject =
  | { userId: string; deviceId?: never }
  | { deviceId: string; userId?: never };

export type Entitlement = {
  entitlementKey: string;
  plan: "free" | "paid";
};

export type LimitDecision =
  | { ok: true }
  | { ok: false; limit: number; reason: string };

export type RegisteredTool = {
  config: ToolConfig;
  copy: ToolCopy;
  Tool: ToolComponent;
};
