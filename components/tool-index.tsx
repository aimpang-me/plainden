"use client";

import Link from "next/link";
import { useState } from "react";

export type ToolIndexItem = {
  id: string;
  href: string;
  name: string;
  description: string;
};

export function ToolIndex({ tools }: { tools: readonly ToolIndexItem[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? tools.filter((tool) => `${tool.name} ${tool.description}`.toLowerCase().includes(needle))
    : tools;

  return (
    <section id="tools" className="grid gap-4" aria-label="Tools">
      <label className="grid gap-1.5 text-[13px] text-muted" htmlFor="tool-search">
        Search tools
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 w-full min-w-0 rounded-[7px] border border-line bg-field px-2.5 text-[13px] text-ink"
        />
      </label>
      {shown.length === 0 ? <p>No tools match.</p> : null}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((tool) => (
          <li
            key={tool.id}
            className="rounded-[10px] border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(40,30,10,0.05),0_4px_14px_rgba(40,30,10,0.05)]"
          >
            <Link href={tool.href} className="text-[15px] font-medium tracking-[-0.01em]">
              {tool.name}
            </Link>
            <p className="mt-1 text-[13px] text-muted">{tool.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
