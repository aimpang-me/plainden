import type { ToolConfig } from "../../lib/contract/types";

const mb = 1024 * 1024;

export const config = {
  id: "pdf",
  name: "PDF tools",
  slugs: ["merge-pdf", "split-pdf", "compress-pdf", "jpg-to-pdf"],
  title: "PDF tools",
  description: "Merge, split, compress, or turn JPG files into a PDF in the browser.",
  entitlementKey: "pdf",
  priceLookupKey: "plainden_pdf_month",
  limits: {
    free: { fileSize: 25 * mb, perDay: 5 },
    paid: { fileSize: 200 * mb },
  },
  seoPages: [
    "compress-pdf-to-4mb",
    "merge-pdf-files",
    "split-pdf-pages",
    "jpg-to-pdf-photos",
    "compress-pdf-scans",
  ],
} satisfies ToolConfig;
