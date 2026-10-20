import type { ReceiptPreset } from "../invoice/document";

export const receiptSlugs = {
  rent: "rent-receipt-generator",
  cash: "cash-receipt-template",
  payment: "payment-receipt-generator",
  word: "receipt-template-word",
  donation: "donation-receipt-template",
} as const;

const samples: Record<string, ReceiptPreset> = {
  [receiptSlugs.rent]: {
    from: { name: "Harbour Rentals" },
    to: { name: "Ada Lane" },
    number: "RENT-20",
    currency: "USD",
    taxPercent: "0",
    method: "transfer",
    notes: "Rent for the month named in the line.",
    lines: [{ description: "October rent", quantity: "1", unitPrice: "1200.00" }],
  },
  [receiptSlugs.cash]: {
    from: { name: "Corner Shop" },
    to: { name: "Walk-in" },
    number: "CASH-20",
    currency: "USD",
    taxPercent: "0",
    method: "cash",
    notes: "Cash sale. Count the notes before you hand this over.",
    lines: [{ description: "Goods", quantity: "1", unitPrice: "18.00" }],
  },
  [receiptSlugs.payment]: {
    from: { name: "Northwind Studio" },
    to: { name: "Harbour Co" },
    number: "PAY-20",
    currency: "USD",
    taxPercent: "0",
    method: "card",
    notes: "Payment received. The stamp on the preview reads PAID.",
    lines: [{ description: "Invoice CA-1001", quantity: "1", unitPrice: "210.00" }],
  },
  [receiptSlugs.word]: {
    from: { name: "Plain Desk" },
    to: { name: "River School" },
    number: "RW-20",
    currency: "USD",
    taxPercent: "0",
    method: "check",
    notes: "This is a PDF receipt with the fields of a Word receipt template.",
    lines: [{ description: "Workshop", quantity: "1", unitPrice: "250.00" }],
  },
  [receiptSlugs.donation]: {
    from: { name: "Cedar Hall" },
    to: { name: "Bea Moss" },
    number: "DON-20",
    currency: "USD",
    taxPercent: "0",
    method: "other",
    notes: "Donation receipt. It is not a tax form.",
    lines: [{ description: "Donation", quantity: "1", unitPrice: "50.00" }],
  },
};

export function receiptPreset(preset?: string): ReceiptPreset {
  if (!preset) return {};
  return samples[preset] ?? {};
}
