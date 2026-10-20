"use client";

import { useState } from "react";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { openReceipt } from "@/tools/invoice/document";
import { DocumentEditor } from "@/tools/invoice/editor";
import { invoiceTransport } from "@/tools/invoice/transport";
import { config } from "./config";
import { receiptPreset } from "./presets";

export default function Tool({ preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const [draft, setDraft] = useState(() => openReceipt(receiptPreset(preset)));
  return (
    <DocumentEditor
      draft={draft}
      plan={entitlement.plan}
      limits={config.limits}
      transport={invoiceTransport}
      onDraft={(next) => {
        if (next.kind === "receipt") setDraft(next);
      }}
    />
  );
}
