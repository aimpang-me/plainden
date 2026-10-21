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
      <label className="grid gap-1.5 text-[13px] text-secondary" htmlFor="tool-search">
        Search tools
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field"
        />
      </label>
      {shown.length === 0 ? <p>No tools match.</p> : null}
      <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((tool) => (
          <li key={tool.id} className="surface p-4">
            <Link href={tool.href} className="text-[15px] font-medium tracking-[-0.01em]">
              {tool.name}
            </Link>
            <p className="mt-1 text-[13px] text-secondary">{tool.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
