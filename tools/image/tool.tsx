"use client";

import { useState, type FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { canvasEncoder } from "./encode";
import { imageOps, type ImageField } from "./engine";
import { runImage } from "./run";
import { config } from "./config";

type Download = { name: string; url: string };

function FieldControl({ field, onChange }: { field: ImageField; onChange: (name: string, value: string) => void }) {
  switch (field.kind) {
    case "select":
      return (
        <Select
          label={field.label}
          name={field.name}
          value={field.value}
          options={field.options}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          label={field.label}
          name={field.name}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          value={field.value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      );
    default: {
      const unreachable: never = field;
      return unreachable;
    }
  }
}

export default function Tool({ slug, preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const view = Object.values(imageOps).find((row) => row.matches(slug)) ?? null;
  const [seenSlug, setSeenSlug] = useState(slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);

  if (seenSlug !== slug) {
    setSeenSlug(slug);
    setValues({});
    setFiles([]);
    setMessage("");
    setBlocked(false);
    setRunning(false);
    setDownloads((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });
  }

  function setField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function replaceDownloads(next: Download[]) {
    setDownloads((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view || running) return;
    setBlocked(false);
    replaceDownloads([]);
    setRunning(true);
    try {
      const result = await runImage({
        op: view.op,
        plan: entitlement.plan,
        preset,
        values,
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          read: async () => new Uint8Array(await file.arrayBuffer()),
        })),
        encode: canvasEncoder,
      });
      if (!result.ok) {
        setBlocked(result.limit);
        setMessage(result.reason);
        return;
      }
      setMessage(result.note);
      replaceDownloads(
        result.files.map((file) => {
          const bytes = new Uint8Array(file.bytes);
          return { name: file.name, url: URL.createObjectURL(new Blob([bytes], { type: file.mime })) };
        }),
      );
    } finally {
      setRunning(false);
    }
  }

  if (!view) {
    return (
      <Card title="Image tools">
        <p role="status">This page is not an image tool.</p>
      </Card>
    );
  }

  return (
    <Card title={view.title}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <FileDrop
          label="Images"
          multiple={view.multiple}
          accept={view.accept}
          onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
        />
        {files.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                <span>
                  {file.name}, {file.size} bytes
                </span>
                <Button type="button" variant="plain" onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}>
                  Remove {file.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {view.fields({ preset, values }).map((field) => (
          <FieldControl key={field.name} field={field} onChange={setField} />
        ))}
        <Button type="submit" disabled={running}>
          {view.button}
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
