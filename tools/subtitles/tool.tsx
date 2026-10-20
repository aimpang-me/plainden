"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";
import {
  convertSubtitle,
  gateBatch,
  jobFor,
  outputChoices,
  parseShiftMs,
  readOutput,
  type OutputChoice,
} from "./convert";

type Download = { name: string; url: string };

function statusFor(fileCount: number, cueCount: number): string {
  if (cueCount === 0) return "Shift removed every cue.";
  if (fileCount === 1) return "Converted 1 file.";
  return `Converted ${fileCount} files.`;
}

function mimeFor(format: "srt" | "vtt" | "ass"): string {
  switch (format) {
    case "srt":
      return "application/x-subrip";
    case "vtt":
      return "text/vtt";
    case "ass":
      return "text/plain";
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}

export default function Tool({ slug, preset }: ToolProps) {
  const job = jobFor(slug, preset);
  const entitlement = useEntitlement(config.entitlementKey);
  const [files, setFiles] = useState<File[]>([]);
  const [output, setOutput] = useState<OutputChoice>(job.output);
  const [shift, setShift] = useState(String(job.shiftMs));
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const pageKey = `${slug}:${preset ?? ""}`;
  const [pageKeySeen, setPageKeySeen] = useState(pageKey);
  if (pageKeySeen !== pageKey) {
    setPageKeySeen(pageKey);
    setFiles([]);
    setOutput(job.output);
    setShift(String(job.shiftMs));
    setMessage("");
    setBlocked(false);
    setDownloads((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });
  }

  function replaceDownloads(next: Download[]) {
    setDownloads((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    setBlocked(false);
    replaceDownloads([]);
    if (files.length === 0) {
      setMessage("Add a subtitle file.");
      return;
    }
    const shiftMs = parseShiftMs(shift);
    if (shiftMs === null) {
      setMessage("Shift must be a whole number of milliseconds.");
      return;
    }
    const decision = gateBatch(entitlement.plan, files.length);
    if (!decision.ok) {
      setBlocked(true);
      setMessage(decision.reason);
      return;
    }
    const chosen = job.lockOutput ? job.output : output;
    setRunning(true);
    try {
      const next: Download[] = [];
      let cueCount = 0;
      for (const file of files) {
        const result = convertSubtitle({
          bytes: new Uint8Array(await file.arrayBuffer()),
          fileName: file.name,
          output: chosen,
          shiftMs,
        });
        if (!result.ok) {
          for (const item of next) URL.revokeObjectURL(item.url);
          setMessage(`${file.name}. ${result.reason}`);
          return;
        }
        cueCount += result.cueCount;
        const bytes = new TextEncoder().encode(result.text);
        next.push({
          name: result.fileName,
          url: URL.createObjectURL(new Blob([bytes], { type: mimeFor(result.format) })),
        });
      }
      replaceDownloads(next);
      setMessage(statusFor(files.length, cueCount));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card title="Convert">
      <form className="grid gap-3" onSubmit={onSubmit}>
        {job.note ? <p>{job.note}</p> : null}
        <FileDrop
          label="Subtitle files"
          multiple
          accept=".srt,.vtt,.ass,.ssa,text/vtt"
          onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
        />
        {files.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                <span>
                  {file.name}, {file.size} bytes
                </span>
                <Button
                  type="button"
                  variant="plain"
                  onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}
                >
                  Remove {file.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {job.lockOutput ? null : (
          <Select
            label="Output"
            name="output"
            value={output}
            options={outputChoices()}
            onChange={(event) => {
              const next = readOutput(event.target.value);
              if (next) setOutput(next);
            }}
          />
        )}
        <Input
          label="Timing shift (ms)"
          name="shift"
          inputMode="numeric"
          value={shift}
          onChange={(event) => setShift(event.target.value)}
        />
        <Button type="submit" disabled={running}>
          Convert
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
