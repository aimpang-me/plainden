"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LimitKind } from "@/lib/contract/limits";
import type { ToolProps } from "@/lib/contract/types";
import { decideLimit } from "@/lib/entitlements/decide-limit";
import { visitorLimitCopy } from "@/lib/entitlements/visitor-copy";
import { useEntitlement } from "@/lib/entitlements/use-entitlement";
import { config } from "./config";

export default function Tool({ slug, preset }: ToolProps) {
  const entitlement = useEntitlement(config.entitlementKey);
  const [note, setNote] = useState(preset ?? "");
  const [count, setCount] = useState("1");
  const [format, setFormat] = useState("text");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(count);
    const decision = decideLimit({
      plan: entitlement.plan,
      limits: config.limits,
      kind: LimitKind.perMonth,
      amount,
    });
    const fileBit = fileName ? ` File ${fileName}.` : "";
    if (decision.ok) {
      setBlocked(false);
      setMessage(`Allowed on the free plan. Format ${format}.${fileBit} Note ${note}. Slug ${slug}.`);
      return;
    }
    setBlocked(true);
    setMessage(visitorLimitCopy("scaffold", decision));
  }

  return (
    <Card title="Check a count">
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input label="Note" name="note" value={note} onChange={(event) => setNote(event.target.value)} />
        <Input label="Count" name="count" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} />
        <Select
          label="Format"
          name="format"
          value={format}
          onChange={(event) => setFormat(event.target.value)}
          options={[
            { value: "text", label: "Text" },
            { value: "html", label: "HTML" },
          ]}
        />
        <FileDrop
          label="Sample file"
          onFiles={(files) => setFileName(files[0]?.name ?? "")}
        />
        <Button type="submit">Check</Button>
        <p role="status">{message}</p>
        {blocked ? <UpgradePrompt reason={message} /> : null}
      </form>
    </Card>
  );
}
