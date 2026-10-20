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
    <section id="tools" className="grid gap-8" aria-label="Tools">
      <label className="grid gap-1.5 text-[13px] text-muted" htmlFor="tool-search">
        Search tools
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 w-full min-w-0 rounded-xl border border-line bg-paper px-3.5 text-[15px] text-ink"
        />
      </label>
      {shown.length === 0 ? <p>No tools match.</p> : null}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((tool) => (
          <li
            key={tool.id}
            className="rounded-3xl border border-line-soft p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_40px_rgba(0,0,0,0.04)] max-[800px]:p-6"
          >
            <Link href={tool.href} className="text-lg font-medium tracking-[-0.02em]">
              {tool.name}
            </Link>
            <p className="mt-2 text-sm text-muted">{tool.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
