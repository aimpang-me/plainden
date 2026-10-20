"use client";

import type { FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ToolProps } from "@/lib/contract/types";
import { useQrForm, type QrField } from "./browser";

export default function Tool({ slug, preset }: ToolProps) {
  const form = useQrForm(preset);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.submit();
  }

  return (
    <Card title="Make a QR code">
      <form className="grid gap-3" data-slug={slug} onSubmit={onSubmit}>
        <Select
          label="Payload"
          name="kind"
          value={form.kind}
          onChange={(event) => form.setKind(event.target.value)}
          options={form.kinds.map((kind) => ({ value: kind.kind, label: kind.label }))}
        />
        {form.fields.map((field) => renderField(field))}
        <Select
          label="File"
          name="format"
          value={form.format}
          onChange={(event) => form.setFormat(event.target.value)}
          options={[
            { value: "png", label: "PNG" },
            { value: "svg", label: "SVG" },
          ]}
        />
        {form.canPublish ? (
          <Select
            label="Output"
            name="intent"
            value={form.intent}
            onChange={(event) => form.setIntent(event.target.value)}
            options={[
              { value: "download", label: "Download a static code" },
              { value: "publish", label: "Publish a dynamic code" },
            ]}
          />
        ) : null}
        {form.intent === "publish" && form.canPublish ? (
          <FileDrop label="Center logo" onFiles={(files) => form.setLogoFile(files[0] ?? null)} />
        ) : null}
        {form.hasLogo ? (
          <Button type="button" variant="plain" onClick={form.clearLogo}>
            Remove logo
          </Button>
        ) : null}
        <Button type="submit">{form.editing ? "Save changes" : "Create"}</Button>
        <p role="status">{form.status}</p>
        {form.upgradeReason ? <UpgradePrompt reason={form.upgradeReason} /> : null}
        {form.preview ? (
          <object data={form.preview.src} type={form.preview.type} aria-label="QR code" className="h-64 w-64">
            QR code
          </object>
        ) : null}
        {form.preview ? (
          <Button type="button" variant="plain" onClick={form.preview.download}>
            Download
          </Button>
        ) : null}
        {form.saved.length > 0 ? (
          <ul>
            {form.saved.map((code) => (
              <li key={code.id}>
                {code.shortPath} {code.scanCount} scans
                <Button type="button" variant="plain" onClick={code.download}>
                  Download
                </Button>
                <Button type="button" variant="plain" onClick={code.startReplace}>
                  Edit
                </Button>
                <Button type="button" variant="plain" onClick={code.remove}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </Card>
  );
}

function renderField(field: QrField) {
  switch (field.control) {
    case "text":
    case "password":
      return (
        <Input
          key={field.name}
          label={field.label}
          name={field.name}
          type={field.control}
          value={field.value}
          onChange={(event) => field.set(event.target.value)}
        />
      );
    case "select":
      return (
        <Select
          key={field.name}
          label={field.label}
          name={field.name}
          value={field.value}
          options={field.options}
          onChange={(event) => field.set(event.target.value)}
        />
      );
    default: {
      const unreachable: never = field.control;
      return unreachable;
    }
  }
}
