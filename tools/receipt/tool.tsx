"use client";

import { useState } from "react";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { openReceipt, stableFormDate, stampReceiptDate } from "@/tools/invoice/document";
import { formClock, useFormDay } from "@/tools/invoice/form-day";
import { DocumentEditor } from "@/tools/invoice/editor";
import { invoiceTransport } from "@/tools/invoice/transport";
import { config } from "./config";
import { receiptPreset } from "./presets";

export default function Tool({ preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const day = useFormDay();
  const seed = receiptPreset(preset);
  const [draft, setDraft] = useState(() => openReceipt(seed, stableFormDate));
  const shown = stampReceiptDate(draft, seed, formClock(day));
  return (
    <DocumentEditor
      draft={shown}
      plan={entitlement.status === "ready" ? entitlement.plan : "loading"}
      limits={config.limits}
      transport={invoiceTransport}
      onDraft={(next) => {
        if (next.kind === "receipt") setDraft(next);
      }}
    />
  );
}
