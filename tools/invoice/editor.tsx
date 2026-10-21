"use client";

import { useEffect, useRef, useState } from "react";
import { PageActions } from "@/components/app-shell";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LimitKind } from "@/lib/contract/limits";
import type { LimitTable } from "@/lib/contract/types";
import { decideLimit } from "@/lib/entitlements/decide-limit";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import {
  clientsFromSavedList,
  CURRENCIES,
  draftFromSavedList,
  issue,
  PAYMENT_METHODS,
  readLogo,
  reduce,
  TEMPLATE_IDS,
  toWire,
  view,
  type Draft,
  type DraftAction,
  type Party,
  type Plan,
} from "./document";
import { addMonthCount, localMonthStore, readMonthCount } from "./month-count";
import { exportPdf } from "./pdf";
import type { InvoiceTransport } from "./transport";

type EditorProps = {
  draft: Draft;
  plan: Plan | "loading";
  limits: { free: LimitTable; paid: LimitTable };
  transport: InvoiceTransport;
  onDraft: (draft: Draft) => void;
};

const currencyOptions = CURRENCIES.map((currency) => ({ value: currency, label: currency }));
const templateOptions = TEMPLATE_IDS.map((template) => ({ value: template, label: template }));
const methodOptions = PAYMENT_METHODS.map((method) => ({ value: method, label: method }));

function messageFrom(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  const error = payload.error;
  if (error === "sign in required") return "Sign in to save.";
  if ("message" in payload && typeof payload.message === "string") return payload.message;
  return null;
}

export function DocumentEditor({ draft, plan, limits, transport, onDraft }: EditorProps) {
  const ready = plan !== "loading";
  const activePlan: Plan = plan === "paid" ? "paid" : "free";
  const preview = view(draft, activePlan);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [clients, setClients] = useState<readonly Party[]>([]);
  const [clientsReady, setClientsReady] = useState(false);
  const documentId = useRef<string | null>(null);
  function savedId(): string {
    if (!documentId.current) documentId.current = crypto.randomUUID();
    return documentId.current;
  }
  const saveDecision = decideLimit({ plan: activePlan, limits, kind: LimitKind.savedItems, amount: 1 });

  useEffect(() => {
    if (plan !== "paid" || draft.kind !== "invoice") return;
    let cancelled = false;
    void transport.list("invoice").then((payload) => {
      if (cancelled) return;
      setClients(clientsFromSavedList(payload));
      setClientsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [plan, draft.kind, transport]);

  function change(action: DraftAction) {
    onDraft(reduce(draft, action));
  }

  async function onDownload() {
    if (!ready) return;
    const used = readMonthCount(localMonthStore, new Date());
    const decision = decideLimit({ plan: activePlan, limits, kind: LimitKind.perMonth, amount: used + 1 });
    if (!decision.ok) {
      setBlocked(true);
      setMessage(visitorLimitCopy(draft.kind, decision));
      return;
    }
    const result = await exportPdf(draft, activePlan);
    if (!result.ok) {
      setBlocked(false);
      setMessage(result.issues.map((issue) => issue.message).join(" "));
      return;
    }
    const blob = new Blob([Uint8Array.from(result.bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    addMonthCount(localMonthStore, draft.kind, new Date());
    setBlocked(false);
    setMessage(`Downloaded ${result.filename}`);
  }

  async function onSave() {
    if (!ready || !saveDecision.ok) return;
    const issued = issue(draft);
    if (!issued.ok) {
      setMessage(issued.issues.map((item) => item.message).join(" "));
      return;
    }
    const id = savedId();
    const payload = await transport.save({ id, document: toWire(issued.issued) });
    const failure = messageFrom(payload);
    setMessage(failure ?? `Saved ${id}`);
    if (!failure && draft.kind === "invoice") {
      const listed = await transport.list("invoice");
      setClients(clientsFromSavedList(listed));
      setClientsReady(true);
    }
  }

  async function onLoad() {
    const payload = await transport.list(draft.kind);
    const failure = messageFrom(payload);
    if (failure) {
      setMessage(failure);
      return;
    }
    const restored = draftFromSavedList(payload, draft.kind);
    if (restored) onDraft(restored);
    if (draft.kind === "invoice") {
      setClients(clientsFromSavedList(payload));
      setClientsReady(true);
    }
    setMessage("Saved documents loaded.");
  }

  async function onLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    const result = await readLogo(file);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    change({ type: "logo", value: result.logo });
  }

  return (
    <div className="panel-stack">
      <Card title={preview.heading}>
        <form
          id="invoice-form"
          className="field-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void onDownload();
          }}
        >
          <Input label="Your name" name="fromName" value={draft.from.name} onChange={(event) => change({ type: "from", field: "name", value: event.target.value })} />
          <Input label="Your address" name="fromAddress" value={draft.from.address} onChange={(event) => change({ type: "from", field: "address", value: event.target.value })} />
          <Input label="Client name" name="toName" value={draft.to.name} onChange={(event) => change({ type: "to", field: "name", value: event.target.value })} />
          <Input label="Client address" name="toAddress" value={draft.to.address} onChange={(event) => change({ type: "to", field: "address", value: event.target.value })} />
          <Input
            label={preview.numberLabel}
            name="number"
            value={draft.number}
            onChange={(event) => change({ type: "number", value: event.target.value })}
          />
          <Select label="Currency" name="currency" value={draft.currency} options={currencyOptions} onChange={(event) => change({ type: "currency", value: event.target.value })} />
          {draft.kind === "invoice" ? (
            <>
              <Input label="Issued on" name="issuedOn" value={draft.issuedOn} onChange={(event) => change({ type: "issuedOn", value: event.target.value })} />
              <Input label="Due on" name="dueOn" value={draft.dueOn} onChange={(event) => change({ type: "dueOn", value: event.target.value })} />
            </>
          ) : (
            <>
              <Input label="Paid on" name="paidOn" value={draft.paidOn} onChange={(event) => change({ type: "paidOn", value: event.target.value })} />
              <Select label="Payment method" name="method" value={draft.method} options={[{ value: "", label: "Choose" }, ...methodOptions]} onChange={(event) => change({ type: "method", value: event.target.value })} />
            </>
          )}
          <Input label="Tax percent" name="taxPercent" value={draft.taxPercent} onChange={(event) => change({ type: "taxPercent", value: event.target.value })} />
          <Input label="Notes" name="notes" value={draft.notes} onChange={(event) => change({ type: "notes", value: event.target.value })} />
          <Select label="Template" name="template" value={draft.template} options={templateOptions} onChange={(event) => change({ type: "template", value: event.target.value })} />
          {draft.lines.map((line, index) => (
            <div className="col-span-full grid gap-3 min-[701px]:grid-cols-3" key={line.key}>
              <Input label={index === 0 ? "Description" : `Description ${index + 1}`} name={`description-${line.key}`} value={line.description} onChange={(event) => change({ type: "line.edit", key: line.key, field: "description", value: event.target.value })} />
              <Input label={index === 0 ? "Quantity" : `Quantity ${index + 1}`} name={`quantity-${line.key}`} value={line.quantity} onChange={(event) => change({ type: "line.edit", key: line.key, field: "quantity", value: event.target.value })} />
              <Input label={index === 0 ? "Unit price" : `Unit price ${index + 1}`} name={`price-${line.key}`} value={line.unitPrice} onChange={(event) => change({ type: "line.edit", key: line.key, field: "unitPrice", value: event.target.value })} />
            </div>
          ))}
          <div className="col-span-full">
            <Button type="button" variant="plain" onClick={() => change({ type: "line.add" })}>
              Add line
            </Button>
          </div>
          {plan === "paid" && draft.kind === "invoice" ? (
            <div className="col-span-full grid gap-1">
              <p>Saved clients</p>
              {clientsReady && clients.length === 0 ? <p>No saved clients yet.</p> : null}
              {clients.length > 0 ? (
                <ul>
                  {clients.map((client) => (
                    <li key={`${client.email}|${client.name}`}>{client.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {plan === "paid" ? (
            <div className="col-span-full">
              <FileDrop label="Logo PNG or JPEG, 200 KB max" onFiles={(files) => void onLogo(files)} />
            </div>
          ) : null}
          {plan === "free" ? <p className="col-span-full">A logo is part of the paid plan.</p> : null}
          <PageActions>
            <Button type="submit" form="invoice-form" disabled={!ready}>
              Download PDF
            </Button>
            {ready && saveDecision.ok ? (
              <Button type="button" variant="plain" onClick={() => void onSave()}>
                Save
              </Button>
            ) : null}
          </PageActions>
          <div className="col-span-full">
            <Button type="button" variant="plain" onClick={() => void onLoad()}>
              Load saved
            </Button>
          </div>
          <p className="col-span-full" role="status">{message}</p>
          {ready && blocked ? (
            <div className="col-span-full">
              <UpgradePrompt reason={message} />
            </div>
          ) : null}
          {ready && !saveDecision.ok ? (
            <div className="col-span-full">
              <UpgradePrompt reason={visitorLimitCopy(draft.kind, saveDecision)} />
            </div>
          ) : null}
        </form>
      </Card>
      <Card title="Preview">
        <p className="title text-[22px]">{preview.heading}</p>
        <p>{preview.from.name}</p>
        {preview.from.address ? <p>{preview.from.address}</p> : null}
        <p>{preview.to.name}</p>
        {preview.to.address ? <p>{preview.to.address}</p> : null}
        <p>
          {preview.numberLabel} {preview.number}
        </p>
        {preview.lines.map((line) => (
          <p key={line.key} className="flex items-baseline justify-between gap-4">
            <span>{line.description}</span>
            <span className="tabular-nums">{line.amount}</span>
          </p>
        ))}
        <p className="flex items-baseline justify-between gap-4">
          <span>Subtotal</span>
          <span className="tabular-nums">{preview.subtotal}</span>
        </p>
        <p className="flex items-baseline justify-between gap-4">
          <span>{preview.taxLabel}</span>
          <span className="tabular-nums">{preview.tax}</span>
        </p>
        <p className="flex items-baseline justify-between gap-4">
          <span>Total</span>
          <span className="tabular-nums">{preview.total}</span>
        </p>
        {preview.notes ? <p>{preview.notes}</p> : null}
        {preview.stamp ? (
          <p>
            <span className="pill pill-paid">{preview.stamp}</span>
          </p>
        ) : null}
        {preview.footer ? <p>{preview.footer}</p> : null}
        {preview.template !== draft.template ? <p>The free plan downloads the plain template.</p> : null}
      </Card>
    </div>
  );
}
