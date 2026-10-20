"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  acceptsFilename,
  convert,
  directionForSlug,
  fileAccept,
  gateBytes,
  missingFileReason,
  optionNote,
  optionsFromPreset,
  type Direction,
  type Grid,
  type Options,
} from "./convert";
import { deletePreset, presetsFromSnapshot, presetSnapshot, savePreset, subscribePresets, type SavedPreset } from "./presets";

const previewCap = 8;

const titles: Record<Direction, string> = {
  "csv-to-json": "CSV to JSON",
  "json-to-csv": "JSON to CSV",
  "excel-to-csv": "Excel to CSV",
};

const fileLabels: Record<Direction, string> = {
  "csv-to-json": "CSV file",
  "json-to-csv": "JSON file",
  "excel-to-csv": "Excel file",
};

type Status =
  | { kind: "idle"; text: string }
  | { kind: "blocked"; text: string }
  | { kind: "error"; text: string }
  | { kind: "ready"; text: string; url: string; filename: string; grid: Grid; note: string };

const idle: Status = { kind: "idle", text: "" };

function delimiterToken(options: Options): string {
  if (options.delimiter === ";") return "semicolon";
  if (options.delimiter === "\t") return "tab";
  return "comma";
}

function delimiterFromToken(token: string): Options["delimiter"] | null {
  if (token === "comma") return ",";
  if (token === "semicolon") return ";";
  if (token === "tab") return "\t";
  return null;
}

export default function Tool({ slug, preset }: ToolProps) {
  return <Converter key={`${slug}:${preset ?? ""}`} slug={slug} preset={preset} />;
}

function Converter({ slug, preset }: ToolProps) {
  const direction = directionForSlug(slug);
  const entitlement = useEntitlement(config.entitlementKey);
  const snapshot = useSyncExternalStore(subscribePresets, presetSnapshot, emptySnapshot);
  const presets = presetsFromSnapshot(snapshot);
  const [options, setOptions] = useState<Options>(() => optionsFromPreset(preset));
  const [file, setFile] = useState<File | null>(null);
  const [presetName, setPresetName] = useState("");
  const [status, setStatus] = useState<Status>(idle);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function publish(next: Status) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next.kind === "ready" ? next.url : null;
    setStatus(next);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!direction) return;
    if (!file) {
      publish({ kind: "error", text: missingFileReason(direction) });
      return;
    }
    if (!acceptsFilename(direction, file.name)) {
      publish({ kind: "error", text: "This file type does not match this page." });
      return;
    }
    const decision = gateBytes(entitlement.plan, file.size);
    if (!decision.ok) {
      publish({ kind: "blocked", text: decision.reason });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = convert({ direction, filename: file.name, bytes, options });
    if (!result.ok) {
      publish({ kind: "error", text: result.reason });
      return;
    }
    const url = URL.createObjectURL(new Blob([result.converted.text], { type: result.converted.mime }));
    publish({
      kind: "ready",
      text: `Converted ${result.converted.rowCount} rows.`,
      url,
      filename: result.converted.filename,
      grid: result.converted.grid,
      note: result.converted.note,
    });
  }

  function onSave() {
    if (entitlement.plan !== "paid") {
      publish({ kind: "blocked", text: "Saved presets are on the paid plan." });
      return;
    }
    const saved = savePreset(localStorage, presetName, options);
    if (!saved.ok) {
      publish({ kind: "error", text: saved.reason });
      return;
    }
    publish({ kind: "idle", text: `Saved preset ${presetName.trim()}.` });
  }

  function onLoad(saved: SavedPreset) {
    setOptions(saved.options);
    publish({ kind: "idle", text: `Loaded preset ${saved.name}.` });
  }

  if (!direction) {
    return (
      <Card title="Data converter">
        <p role="status">This page is not a data converter.</p>
      </Card>
    );
  }

  const preview = status.kind === "ready" ? status.grid.rows.slice(0, previewCap) : [];

  return (
    <Card title={titles[direction]}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <p>{optionNote(options)}</p>
        <FileDrop label={fileLabels[direction]} accept={fileAccept(direction)} onFiles={(incoming) => setFile(incoming[0] ?? null)} />
        {file ? (
          <p className="flex items-center justify-between gap-2 text-sm">
            <span>
              {file.name}, {file.size} bytes
            </span>
            <Button type="button" variant="plain" onClick={() => setFile(null)}>
              Remove {file.name}
            </Button>
          </p>
        ) : null}
        <Select
          label="Delimiter"
          name="delimiter"
          value={delimiterToken(options)}
          options={[
            { value: "comma", label: "Comma" },
            { value: "semicolon", label: "Semicolon" },
            { value: "tab", label: "Tab" },
          ]}
          onChange={(event) => {
            const delimiter = delimiterFromToken(event.target.value);
            if (!delimiter) return;
            setOptions((current) => ({ ...current, delimiter }));
          }}
        />
        {direction === "excel-to-csv" ? (
          <Select
            label="Sheets"
            name="sheets"
            value={options.sheet}
            options={[
              { value: "first", label: "First sheet" },
              { value: "all", label: "All sheets" },
            ]}
            onChange={(event) => {
              const sheet = event.target.value === "all" ? "all" : "first";
              setOptions((current) => ({ ...current, sheet }));
            }}
          />
        ) : (
          <Select
            label="JSON shape"
            name="json-shape"
            value={options.jsonShape}
            options={[
              { value: "objects", label: "Objects" },
              { value: "rows", label: "Rows" },
            ]}
            onChange={(event) => {
              const jsonShape = event.target.value === "rows" ? "rows" : "objects";
              setOptions((current) => ({ ...current, jsonShape }));
            }}
          />
        )}
        <Button type="submit">Convert</Button>
        <p role="status">{status.text}</p>
        {status.kind === "blocked" ? <UpgradePrompt reason={status.text} /> : null}
        {status.kind === "ready" && status.note ? <p>{status.note}</p> : null}
        {status.kind === "ready" && status.grid.rows.length > previewCap ? <p>Showing the first 8 rows.</p> : null}
        {status.kind === "ready" ? (
          <>
            <div className="min-w-0 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {status.grid.columns.map((column, index) => (
                    <th key={`${column}-${index}`} className="border border-line px-2 py-1 text-left tabular-nums">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-line px-2 py-1 text-left align-top tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <a href={status.url} download={status.filename}>
              Download {status.filename}
            </a>
          </>
        ) : null}
      </form>
      <div className="mt-4 grid gap-3">
        <Input
          label="Preset name"
          name="preset-name"
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
        />
        <Button type="button" variant="plain" onClick={onSave}>
          Save preset
        </Button>
        {presets.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {presets.map((saved) => (
              <li key={saved.name} className="flex items-center justify-between gap-2">
                <span>{saved.name}</span>
                <span className="flex gap-2">
                  <Button type="button" variant="plain" onClick={() => onLoad(saved)}>
                    Load {saved.name}
                  </Button>
                  <Button type="button" variant="plain" onClick={() => deletePreset(localStorage, saved.name)}>
                    Remove {saved.name}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}

function emptySnapshot(): string {
  return "";
}
