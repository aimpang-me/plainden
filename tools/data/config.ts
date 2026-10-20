import type { ToolConfig } from "../../lib/contract/types";

const mb = 1024 * 1024;

export const config = {
  id: "data",
  name: "Data converter",
  slugs: ["csv-to-json", "json-to-csv", "excel-to-csv"],
  title: "CSV, JSON, and Excel converter",
  description: "Convert CSV, JSON, and Excel files and preview the table.",
  entitlementKey: "data",
  priceLookupKey: "plainden_data_month",
  limits: {
    free: { fileSize: 5 * mb },
    paid: { fileSize: 100 * mb },
  },
  seoPages: [
    "csv-to-json-objects",
    "semicolon-csv-to-json",
    "json-rows-to-csv",
    "excel-first-sheet-to-csv",
    "tab-separated-to-json",
  ],
} satisfies ToolConfig;
