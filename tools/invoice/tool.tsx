"use client";

import { useState } from "react";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";
import { openInvoice, stableFormDate, stampInvoiceDates } from "./document";
import { formClock, useFormDay } from "./form-day";
import { DocumentEditor } from "./editor";
import { invoicePreset } from "./presets";
import { invoiceTransport } from "./transport";

export default function Tool({ preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const day = useFormDay();
  const seed = invoicePreset(preset);
  const [draft, setDraft] = useState(() => openInvoice(seed, stableFormDate));
  const shown = stampInvoiceDates(draft, seed, formClock(day));
  return (
    <DocumentEditor
      draft={shown}
      plan={entitlement.status === "ready" ? entitlement.plan : "loading"}
      limits={config.limits}
      transport={invoiceTransport}
      onDraft={(next) => {
        if (next.kind === "invoice") setDraft(next);
      }}
    />
  );
}
