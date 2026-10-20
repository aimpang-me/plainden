"use client";

import { useEffect, useState } from "react";
import { LimitKind } from "@/lib/contract/limits";
import { decideLimit } from "@/lib/entitlements/decide-limit";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";
import {
  isFormat,
  isPayloadKind,
  parseLogo,
  type Format,
  type HandleResult,
  type LogoDataUrl,
  type PayloadKind,
  type SavedCode,
} from "./contract";
import { kindViews, publishPolicy, renderPreview } from "./engine";
import { readPreset } from "./presets";

const savedCountKey = "plainden.qr.savedCount";
const staticCountKey = "plainden.qr.staticGenerations";

export type QrField = {
  name: string;
  label: string;
  control: "text" | "password" | "select";
  value: string;
  options: readonly { value: string; label: string }[];
  set: (value: string) => void;
};

export type QrForm = {
  kinds: readonly { kind: PayloadKind; label: string }[];
  kind: string;
  setKind: (kind: string) => void;
  fields: readonly QrField[];
  format: string;
  setFormat: (format: string) => void;
  intent: string;
  setIntent: (intent: string) => void;
  canPublish: boolean;
  editing: boolean;
  hasLogo: boolean;
  setLogoFile: (file: File | null) => void;
  clearLogo: () => void;
  ready: boolean;
  submit: () => void;
  status: string;
  upgradeReason: string | null;
  preview: { src: string; type: string; download: () => void } | null;
  saved: readonly {
    id: string;
    shortPath: string;
    scanCount: number;
    download: () => void;
    startReplace: () => void;
    remove: () => void;
  }[];
};

let previewUrl: string | null = null;
let downloadUrl: string | null = null;

function previewSrc(blob: Blob): string {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  return previewUrl;
}

function downloadBlob(blob: Blob, filename: string): void {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.click();
}

function readCount(key: string): number {
  if (typeof localStorage === "undefined") return 0;
  const value = Number(localStorage.getItem(key) ?? "0");
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function writeCount(key: string, value: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, String(value));
}

async function postCommand(body: unknown): Promise<HandleResult> {
  const response = await fetch("/api/qr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (!isHandleResult(payload)) {
    return { ok: false, code: "invalid", reason: "The server sent an unexpected response." };
  }
  return payload;
}

function isHandleResult(value: unknown): value is HandleResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { ok?: unknown; type?: unknown; code?: unknown };
  if (record.ok === true) {
    return record.type === "list" || record.type === "publish" || record.type === "replace" || record.type === "remove";
  }
  if (record.ok === false) {
    return record.code === "signed-out" || record.code === "over-cap" || record.code === "missing" || record.code === "invalid";
  }
  return false;
}


export function useQrForm(preset: string | undefined): QrForm {
  const entitlement = useEntitlement(config.entitlementKey);
  const views = kindViews();
  const initial = readPreset(preset);
  const [kind, setKindState] = useState<PayloadKind>(initial?.kind ?? "url");
  const [values, setValues] = useState<Record<string, string>>({ ...(initial?.values ?? views[0]?.defaults ?? {}) });
  const [format, setFormatState] = useState<Format>("png");
  const [intent, setIntentState] = useState<"download" | "publish">(initial?.intent ?? "download");
  const [logo, setLogo] = useState<LogoDataUrl | null>(null);
  const [logoTouched, setLogoTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ src: string; type: string; blob: Blob; filename: string } | null>(null);
  const [saved, setSaved] = useState<readonly SavedCode[]>([]);
  const [readingLogo, setReadingLogo] = useState(false);

  const view = views.find((item) => item.kind === kind) ?? views[0];
  const canPublish = view?.publish === "url-redirect";

  useEffect(() => {
    if (!canPublish) return;
    let cancelled = false;
    void postCommand({ type: "list" }).then((result) => {
      if (cancelled || !result.ok || result.type !== "list") return;
      setSaved(result.codes);
      writeCount(savedCountKey, result.codes.length);
    });
    return () => {
      cancelled = true;
    };
  }, [canPublish]);

  function setKind(next: string) {
    if (!isPayloadKind(next)) {
      setStatus("That payload is not available.");
      return;
    }
    const nextView = views.find((item) => item.kind === next);
    setKindState(next);
    setValues({ ...(nextView?.defaults ?? {}) });
    setEditingId(null);
    if (publishPolicy(next) === "never") setIntentState("download");
  }

  function setFormat(next: string) {
    if (!isFormat(next)) {
      setStatus("Choose PNG or SVG.");
      return;
    }
    setFormatState(next);
  }

  function setIntent(next: string) {
    if (next !== "download" && next !== "publish") return;
    if (next === "publish" && !canPublish) return;
    setIntentState(next);
    setEditingId(null);
  }

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function setLogoFile(file: File | null) {
    if (!file) {
      setLogo(null);
      setLogoTouched(true);
      return;
    }
    setReadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseLogo(typeof reader.result === "string" ? reader.result : null);
      setReadingLogo(false);
      if (!parsed.ok) {
        setStatus(parsed.reason);
        return;
      }
      setLogo(parsed.logo);
      setLogoTouched(true);
      setStatus("");
    };
    reader.onerror = () => {
      setReadingLogo(false);
      setStatus("Could not read that logo.");
    };
    reader.readAsDataURL(file);
  }

  async function showPreview(nextKind: PayloadKind, nextValues: Record<string, string>, nextFormat: Format, nextLogo: LogoDataUrl | null) {
    const rendered = await renderPreview({
      kind: nextKind,
      values: nextValues,
      format: nextFormat,
      logo: nextFormat === "svg" ? nextLogo : null,
    });
    if (!rendered.ok) {
      setPreview(null);
      setStatus(rendered.reason);
      return null;
    }
    const src = previewSrc(rendered.blob);
    setPreview({ src, type: rendered.blob.type, blob: rendered.blob, filename: rendered.filename });
    return rendered;
  }

  function submit() {
    if (readingLogo) {
      setStatus("Wait for the logo to finish loading.");
      return;
    }
    if (intent === "download" || !canPublish) {
      void showPreview(kind, values, format, null).then((rendered) => {
        if (!rendered) return;
        downloadBlob(rendered.blob, rendered.filename);
        writeCount(staticCountKey, readCount(staticCountKey) + 1);
        setUpgradeReason(null);
        setStatus(format === "png" ? "Downloaded PNG." : "Downloaded SVG.");
      });
      return;
    }
    if (entitlement.status !== "ready") return;
    const amount = intent === "publish" && editingId ? readCount(savedCountKey) : readCount(savedCountKey) + 1;
    const decision = decideLimit({
      plan: entitlement.plan,
      limits: config.limits,
      kind: LimitKind.savedItems,
      amount,
    });
    if (!decision.ok) {
      setUpgradeReason(decision.reason);
      setStatus(decision.reason);
      return;
    }
    const targetUrl = values.href ?? "";
    const body = editingId
      ? { type: "replace", id: editingId, targetUrl, logo: logoTouched ? logo : saved.find((code) => code.id === editingId)?.logo ?? null }
      : { type: "publish", targetUrl, logo };
    void postCommand(body).then(async (result) => {
      if (!result.ok) {
        if (result.code === "over-cap") setUpgradeReason(result.reason);
        setStatus(result.reason);
        return;
      }
      if (result.type !== "publish" && result.type !== "replace") return;
      setUpgradeReason(null);
      setEditingId(null);
      setStatus(result.type === "publish" ? `Published ${result.code.shortPath}.` : "Saved changes.");
      const listed = await postCommand({ type: "list" });
      if (listed.ok && listed.type === "list") {
        setSaved(listed.codes);
        writeCount(savedCountKey, listed.codes.length);
      }
      const origin = window.location.origin;
      await showPreview("text", { text: `${origin}${result.code.shortPath}` }, "svg", result.code.logo);
    });
  }

  function downloadSaved(code: SavedCode) {
    const origin = window.location.origin;
    void showPreview("text", { text: `${origin}${code.shortPath}` }, "svg", code.logo).then((rendered) => {
      if (!rendered) return;
      downloadBlob(rendered.blob, rendered.filename);
      setStatus("Downloaded SVG.");
    });
  }

  async function removeCode(id: string) {
    const result = await postCommand({ type: "remove", id });
    if (!result.ok) {
      setStatus(result.reason);
      return;
    }
    const listed = await postCommand({ type: "list" });
    if (listed.ok && listed.type === "list") {
      setSaved(listed.codes);
      writeCount(savedCountKey, listed.codes.length);
    }
    if (editingId === id) setEditingId(null);
    setStatus("Removed.");
  }

  function startReplace(code: SavedCode) {
    setKindState("url");
    setValues({ href: code.targetUrl });
    setIntentState("publish");
    setEditingId(code.id);
    setLogo(code.logo);
    setLogoTouched(false);
    setStatus(`Editing ${code.shortPath}.`);
  }

  return {
    kinds: views.map((item) => ({ kind: item.kind, label: item.label })),
    kind,
    setKind,
    fields: (view?.fields ?? []).map((field) => ({
      name: field.name,
      label: field.label,
      control: field.control,
      value: values[field.name] ?? "",
      options: field.options ?? [],
      set: (value: string) => setField(field.name, value),
    })),
    format,
    setFormat,
    intent,
    setIntent,
    canPublish,
    editing: editingId !== null,
    hasLogo: logo !== null,
    setLogoFile,
    clearLogo: () => {
      setLogo(null);
      setLogoTouched(true);
    },
    ready: entitlement.status === "ready",
    submit,
    status,
    upgradeReason,
    preview: preview
      ? {
          src: preview.src,
          type: preview.type,
          download: () => downloadBlob(preview.blob, preview.filename),
        }
      : null,
    saved: saved.map((code) => ({
      id: code.id,
      shortPath: code.shortPath,
      scanCount: code.scanCount,
      download: () => downloadSaved(code),
      startReplace: () => startReplace(code),
      remove: () => void removeCode(code.id),
    })),
  };
}
