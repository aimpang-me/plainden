"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Select } from "@/components/ui/select";
import type { ToolProps } from "@/lib/contract/types";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import { config } from "./config";
import { compressVideo } from "./engine";
import { gateVideo } from "./gate";
import { initialPresetId, pageNote, presetById, presets } from "./presets";

type Phase =
  | { kind: "idle"; message: string }
  | { kind: "running"; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "done"; message: string; url: string };

export default function Tool({ slug, preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const [presetId, setPresetId] = useState(initialPresetId(preset));
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle", message: "" });
  const note = pageNote(slug);

  function clearDownload() {
    setPhase((current) => {
      if (current.kind === "done") URL.revokeObjectURL(current.url);
      return { kind: "idle", message: "" };
    });
  }

  function addFiles(incoming: File[]) {
    const next = incoming[0] ?? null;
    setFile(next);
    clearDownload();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase.kind === "running") return;
    const chosen = presetById(presetId);
    if (!file) {
      setPhase({ kind: "idle", message: "Add a video." });
      return;
    }
    if (!chosen) {
      setPhase({ kind: "idle", message: "Pick a preset." });
      return;
    }
    const decision = gateVideo(entitlement.plan, file.size);
    if (!decision.ok) {
      setPhase((current) => {
        if (current.kind === "done") URL.revokeObjectURL(current.url);
        return { kind: "blocked", message: visitorLimitCopy("video", decision) };
      });
      return;
    }
    setPhase((current) => {
      if (current.kind === "done") URL.revokeObjectURL(current.url);
      return { kind: "running", message: "Compressing." };
    });
    const result = await compressVideo(file, chosen);
    if (!result.ok) {
      setPhase({ kind: "idle", message: result.reason });
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: "video/mp4" }));
    setPhase((current) => {
      if (current.kind === "done") URL.revokeObjectURL(current.url);
      return { kind: "done", message: result.message, url };
    });
  }

  return (
    <Card title="Compress">
      <form className="grid gap-3" onSubmit={onSubmit}>
        {note ? <p>{note}</p> : null}
        <FileDrop label="Video file" accept="video/*,.mp4,.webm,.mov" onFiles={addFiles} />
        {file ? (
          <p className="text-sm">
            {file.name}, {file.size} bytes
          </p>
        ) : null}
        <Select
          label="Preset"
          name="preset"
          value={presetId}
          options={presets.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(event) => {
            const next = presetById(event.target.value);
            if (next) setPresetId(next.id);
          }}
        />
        <Button type="submit" disabled={phase.kind === "running"}>
          Compress video
        </Button>
        <p role="status">{phase.message}</p>
        {phase.kind === "blocked" ? <UpgradePrompt reason={phase.message} /> : null}
        {phase.kind === "done" ? (
          <a href={phase.url} download="compressed.mp4">
            compressed.mp4
          </a>
        ) : null}
      </form>
    </Card>
  );
}
