"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import { config } from "./config";
import { encodeJpegWithCanvas } from "./encode";
import { opForSlug, runPdf, type PdfOp } from "./engine";
import { formatFileSize } from "./format-size";
import { gatePdf, operationsUsed, pageNote, recordOperation } from "./gate";

type Download = { name: string; url: string };

const titles: Record<PdfOp, string> = {
  merge: "Merge",
  split: "Split",
  compress: "Compress",
  jpg: "JPG to PDF",
};

const fileLabels: Record<PdfOp, string> = {
  merge: "PDF files",
  split: "PDF file",
  compress: "PDF file",
  jpg: "JPG files",
};

const buttons: Record<PdfOp, string> = {
  merge: "Merge PDFs",
  split: "Split PDF",
  compress: "Compress PDF",
  jpg: "Make PDF",
};

function initialRange(preset: string | undefined): string {
  if (preset && /^(\d+)(?:-(\d+))?$/.test(preset)) return preset;
  return "";
}

export default function Tool({ slug, preset }: ToolProps) {
  const op = opForSlug(slug);
  const entitlement = useEntitlement(config.entitlementKey);
  const [files, setFiles] = useState<File[]>([]);
  const [range, setRange] = useState(initialRange(preset));
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const note = pageNote(slug, preset);

  function replaceDownloads(next: Download[]) {
    setDownloads((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return next;
    });
  }

  function addFiles(incoming: File[]) {
    if (!op) return;
    setFiles((current) => (op === "merge" || op === "jpg" ? [...current, ...incoming] : incoming.slice(0, 1)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!op || running || entitlement.status !== "ready") return;
    setBlocked(false);
    replaceDownloads([]);
    if (files.length === 0) {
      setMessage(op === "jpg" ? "Add a JPG." : "Add a PDF.");
      return;
    }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const decision = gatePdf(entitlement.plan, total, operationsUsed(localStorage, new Date()) + 1);
    if (!decision.ok) {
      setBlocked(true);
      setMessage(visitorLimitCopy("pdf", decision));
      return;
    }
    setRunning(true);
    try {
      const payload = await Promise.all(
        files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })),
      );
      const result = await runPdf({
        op,
        files: payload,
        rangeText: range,
        encodeJpeg: encodeJpegWithCanvas,
      });
      if (!result.ok) {
        setMessage(result.reason);
        return;
      }
      recordOperation(localStorage, new Date());
      setMessage(result.note);
      replaceDownloads(
        result.files.map((file) => {
          const bytes = new Uint8Array(file.bytes);
          return { name: file.name, url: URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })) };
        }),
      );
    } finally {
      setRunning(false);
    }
  }

  if (!op) {
    return (
      <Card title="PDF tools">
        <p role="status">This page is not a PDF tool.</p>
      </Card>
    );
  }

  return (
    <Card title={titles[op]}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        {note ? <p>{note}</p> : null}
        <FileDrop
          label={fileLabels[op]}
          multiple={op === "merge" || op === "jpg"}
          accept={op === "jpg" ? "image/jpeg,.jpg,.jpeg" : "application/pdf,.pdf"}
          onFiles={addFiles}
        />
        {files.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                <span>
                  {file.name}, {formatFileSize(file.size)}
                </span>
                <Button type="button" variant="plain" onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}>
                  Remove {file.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {op === "split" ? (
          <Input label="Pages" name="pages" value={range} onChange={(event) => setRange(event.target.value)} />
        ) : null}
        <Button type="submit" disabled={running || entitlement.status !== "ready"}>
          {buttons[op]}
        </Button>
        <p role="status">{message}</p>
        {blocked ? <UpgradePrompt reason={message} /> : null}
        {downloads.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {downloads.map((item) => (
              <li key={item.url}>
                <a href={item.url} download={item.name}>
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </Card>
  );
}
