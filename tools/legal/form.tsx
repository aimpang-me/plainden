"use client";

import { useEffect, useState } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { draft, jurisdictions, questionnaire, type PolicyField, type PolicyPlan } from "./catalog";
import { toPdf } from "./pdf";

type PolicyFormProps = {
  slug: string;
  preset?: string;
  plan: PolicyPlan;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function valuesOf(fields: readonly PolicyField[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const field of fields) answers[field.id] = field.value;
  return answers;
}

function downloadFile(filename: string, body: string | Uint8Array, type: string) {
  const payload = typeof body === "string" ? body : copyBytes(body);
  const url = URL.createObjectURL(new Blob([payload], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function FieldControl({
  field,
  value,
  onValue,
}: {
  field: PolicyField;
  value: string;
  onValue: (value: string) => void;
}) {
  switch (field.control) {
    case "text":
      return (
        <Input
          label={field.label}
          name={field.id}
          value={value}
          onChange={(event) => onValue(event.target.value)}
        />
      );
    case "jurisdiction":
      return (
        <Select
          label={field.label}
          name={field.id}
          value={value}
          onChange={(event) => onValue(event.target.value)}
          options={[
            { value: "", label: "Select a jurisdiction" },
            ...jurisdictions.map((item) => ({ value: item, label: item })),
          ]}
        />
      );
    default: {
      const unreachable: never = field.control;
      return unreachable;
    }
  }
}

export function PolicyForm({ slug, preset, plan }: PolicyFormProps) {
  const form = questionnaire(slug, preset);
  const [answers, setAnswers] = useState(() => valuesOf(form.fields));
  const [status, setStatus] = useState("");
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [hostedPath, setHostedPath] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ kind: form.kind });
    fetch(`/api/policies?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (isRecord(body) && typeof body.path === "string") setHostedPath(body.path);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [form.kind]);

  const result = draft({ kind: form.kind, answers }, plan);

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function copyText() {
    if (!result.ok) {
      setUpgrade(null);
      setStatus(result.message);
      return;
    }
    await navigator.clipboard.writeText(result.text);
    setUpgrade(null);
    setStatus("Copied the text.");
  }

  async function copyHtml() {
    if (!result.ok) {
      setUpgrade(null);
      setStatus(result.message);
      return;
    }
    await navigator.clipboard.writeText(result.html);
    setUpgrade(null);
    setStatus("Copied the HTML.");
  }

  function downloadMarkdown() {
    if (!result.ok) {
      setUpgrade(null);
      setStatus(result.message);
      return;
    }
    const markdown = result.markdown;
    switch (markdown.ok) {
      case true:
        downloadFile(`${form.kind}-policy.md`, markdown.text, "text/markdown");
        setUpgrade(null);
        setStatus("Downloaded the Markdown.");
        return;
      case false:
        setUpgrade(markdown.message);
        setStatus(markdown.message);
        return;
      default: {
        const unreachable: never = markdown;
        return unreachable;
      }
    }
  }

  async function downloadPdf() {
    const pdf = await toPdf({ kind: form.kind, answers }, plan);
    if (pdf.ok) {
      downloadFile(pdf.filename, pdf.bytes, "application/pdf");
      setUpgrade(null);
      setStatus("Downloaded the PDF.");
      return;
    }
    switch (pdf.error) {
      case "plan":
        setUpgrade(pdf.message);
        setStatus(pdf.message);
        return;
      case "invalid":
      case "font":
        setUpgrade(null);
        setStatus(pdf.message);
        return;
      default: {
        const unreachable: never = pdf;
        return unreachable;
      }
    }
  }

  async function publishPolicy() {
    const response = await fetch("/api/policies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: form.kind, answers }),
    });
    if (response.status === 401) {
      setUpgrade(null);
      setStatus("sign in required");
      return;
    }
    const body: unknown = await response.json();
    if (isRecord(body) && body.ok === true && typeof body.path === "string") {
      setHostedPath(body.path);
      setUpgrade(null);
      setStatus(`Published at ${body.path}.`);
      return;
    }
    if (isRecord(body) && body.ok === false && body.error === "limit" && typeof body.message === "string") {
      setUpgrade(body.message);
      setStatus(body.message);
      return;
    }
    if (isRecord(body) && body.ok === false && typeof body.message === "string") {
      setUpgrade(null);
      setStatus(body.message);
      return;
    }
    setUpgrade(null);
    setStatus("Publish failed.");
  }

  return (
    <Card title={form.title}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {form.fields.map((field) => (
          <FieldControl
            key={field.id}
            field={field}
            value={answers[field.id] ?? ""}
            onValue={(value) => setAnswer(field.id, value)}
          />
        ))}
        <Button type="button" onClick={() => void copyText()}>
          Copy text
        </Button>
        <Button type="button" onClick={() => void copyHtml()}>
          Copy HTML
        </Button>
        <Button type="button" onClick={downloadMarkdown}>
          Download Markdown
        </Button>
        <Button type="button" onClick={() => void downloadPdf()}>
          Download PDF
        </Button>
        <Button type="button" onClick={() => void publishPolicy()}>
          Publish
        </Button>
        <p role="status">{status}</p>
        <pre className="whitespace-pre-wrap">{result.ok ? result.text : ""}</pre>
        {upgrade ? <UpgradePrompt reason={upgrade} /> : null}
      </form>
      {hostedPath ? (
        <p>
          <a href={hostedPath}>{hostedPath}</a>
        </p>
      ) : null}
    </Card>
  );
}
