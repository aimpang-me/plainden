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

export const prices: readonly Price[] = [
  ...toolPrices.flatMap(rowsForTool),
  {
    lookupKey: "plainden_scaffold_month",
    name: "Scaffold monthly",
    amountCents: 0,
    interval: "month",
    entitlementKey: "scaffold",
  },
];

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
