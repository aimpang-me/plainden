"use client";

import { useState } from "react";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";
import { openInvoice } from "./document";
import { DocumentEditor } from "./editor";
import { invoicePreset } from "./presets";
import { invoiceTransport } from "./transport";

export default function Tool({ preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const [draft, setDraft] = useState(() => openInvoice(invoicePreset(preset)));
  return (
    <DocumentEditor
      draft={draft}
      plan={entitlement.plan}
      limits={config.limits}
      transport={invoiceTransport}
      onDraft={(next) => {
        if (next.kind === "invoice") setDraft(next);
      }}
    />
  );
}
