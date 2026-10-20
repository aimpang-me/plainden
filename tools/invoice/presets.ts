import type { InvoicePreset } from "./document";

export const invoiceSlugs = {
  canada: "invoice-generator-canada",
  googleDocs: "invoice-template-google-docs",
  word: "invoice-template-word",
  excel: "invoice-template-excel",
  freelance: "freelance-invoice-template",
} as const;

const samples: Record<string, InvoicePreset> = {
  [invoiceSlugs.canada]: {
    from: { name: "Northwind Studio", address: "12 King St, Toronto" },
    to: { name: "Harbour Co", address: "4 Dock Rd, Halifax" },
    number: "CA-1001",
    currency: "CAD",
    taxPercent: "5",
    notes: "One tax percent on the subtotal. Split GST and PST in the notes if you need both.",
    lines: [{ description: "Consulting", quantity: "2", unitPrice: "100.00" }],
  },
  [invoiceSlugs.googleDocs]: {
    from: { name: "Plain Desk" },
    to: { name: "Maple Blog" },
    number: "GD-20",
    currency: "USD",
    taxPercent: "0",
    notes: "This page is a PDF invoice you can keep beside a Google Doc. It does not export a Doc.",
    lines: [{ description: "Drafting", quantity: "3", unitPrice: "40.00" }],
  },
  [invoiceSlugs.word]: {
    from: { name: "Plain Desk" },
    to: { name: "River School" },
    number: "WD-20",
    currency: "USD",
    taxPercent: "0",
    notes: "This page is a PDF invoice with the same fields people expect from a Word template.",
    lines: [{ description: "Workshop", quantity: "1", unitPrice: "250.00" }],
  },
  [invoiceSlugs.excel]: {
    from: { name: "Plain Desk" },
    to: { name: "Cedar Books" },
    number: "XL-20",
    currency: "USD",
    taxPercent: "0",
    notes: "Line totals are calculated here. This page does not export a spreadsheet.",
    lines: [{ description: "Inventory count", quantity: "4", unitPrice: "25.00" }],
  },
  [invoiceSlugs.freelance]: {
    from: { name: "Ada Lane" },
    to: { name: "North Studio" },
    number: "FR-20",
    currency: "USD",
    taxPercent: "0",
    notes: "Freelance sample with one line. Change the names before you send it.",
    lines: [{ description: "Design", quantity: "8", unitPrice: "75.00" }],
  },
};

export function invoicePreset(preset?: string): InvoicePreset {
  if (!preset) return {};
  return samples[preset] ?? {};
}
