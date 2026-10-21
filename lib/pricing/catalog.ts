export type BillingInterval = "month" | "year";

export type Price = {
  lookupKey: string;
  name: string;
  amountCents: number;
  interval: BillingInterval;
  entitlementKey: string;
};

const toolPrices: readonly {
  entitlementKey: string;
  name: string;
  stem: string;
  monthlyCents: number;
}[] = [
  { entitlementKey: "invoice", name: "Invoice generator", stem: "plainden_invoice", monthlyCents: 500 },
  { entitlementKey: "legal", name: "Privacy and terms", stem: "plainden_legal", monthlyCents: 500 },
  { entitlementKey: "pdf", name: "PDF tools", stem: "plainden_pdf", monthlyCents: 500 },
  { entitlementKey: "qr", name: "QR code generator", stem: "plainden_qr", monthlyCents: 500 },
  { entitlementKey: "image", name: "Image tools", stem: "plainden_image", monthlyCents: 500 },
  { entitlementKey: "video", name: "Video compressor", stem: "plainden_video", monthlyCents: 500 },
  { entitlementKey: "data", name: "Data converter", stem: "plainden_data", monthlyCents: 500 },
  { entitlementKey: "subtitles", name: "Subtitle converter", stem: "plainden_subtitles", monthlyCents: 500 },
  { entitlementKey: "all", name: "All tools", stem: "plainden_all", monthlyCents: 900 },
];

function rowsForTool(tool: (typeof toolPrices)[number]): Price[] {
  return [
    {
      lookupKey: `${tool.stem}_month`,
      name: `${tool.name} monthly`,
      amountCents: tool.monthlyCents,
      interval: "month",
      entitlementKey: tool.entitlementKey,
    },
    {
      lookupKey: `${tool.stem}_year`,
      name: `${tool.name} annual`,
      amountCents: tool.monthlyCents * 10,
      interval: "year",
      entitlementKey: tool.entitlementKey,
    },
  ];
}

export const prices: readonly Price[] = toolPrices.flatMap(rowsForTool);

export function pricesToCreate(): readonly Price[] {
  return prices.filter((price) => price.amountCents > 0);
}

export function priceByLookupKey(lookupKey: string): Price | undefined {
  return prices.find((price) => price.lookupKey === lookupKey);
}

export function formatPrice(amountCents: number, interval: BillingInterval): string {
  const dollars = amountCents / 100;
  const suffix = interval === "month" ? "/mo" : "/yr";
  return `$${dollars}${suffix}`;
}

export type CheckoutPlan = {
  entitlementKey: string;
  name: string;
  monthKey: string;
  yearKey: string;
  monthlyCents: number;
  annualCents: number;
};

function planFor(tool: (typeof toolPrices)[number]): CheckoutPlan {
  return {
    entitlementKey: tool.entitlementKey,
    name: tool.name,
    monthKey: `${tool.stem}_month`,
    yearKey: `${tool.stem}_year`,
    monthlyCents: tool.monthlyCents,
    annualCents: tool.monthlyCents * 10,
  };
}

export function singleToolPlans(): readonly CheckoutPlan[] {
  return toolPrices.filter((tool) => tool.entitlementKey !== "all" && tool.monthlyCents > 0).map(planFor);
}

export function bundlePlan(): CheckoutPlan {
  const tool = toolPrices.find((item) => item.entitlementKey === "all");
  if (!tool) throw new Error("missing bundle price");
  return planFor(tool);
}

export function lookupKeyFor(plan: CheckoutPlan, interval: BillingInterval): string {
  switch (interval) {
    case "month":
      return plan.monthKey;
    case "year":
      return plan.yearKey;
    default: {
      const unreachable: never = interval;
      return unreachable;
    }
  }
}

export function amountFor(plan: CheckoutPlan, interval: BillingInterval): number {
  switch (interval) {
    case "month":
      return plan.monthlyCents;
    case "year":
      return plan.annualCents;
    default: {
      const unreachable: never = interval;
      return unreachable;
    }
  }
}
