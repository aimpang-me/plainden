import { plannedTools } from "../catalog/planned";
import { shellTools } from "../catalog/shell";
import type { Faq, RegisteredTool, ToolConfig, ToolCopy } from "../contract/types";
import { registry } from "../../tools/registry.generated";
import { titleForSlug } from "./slug-title";

export type ResolvedToolPage = {
  kind: "tool";
  slug: string;
  preset?: string;
  config: ToolConfig;
  copy: ToolCopy;
  Tool: RegisteredTool["Tool"];
  headline: string;
  intro?: string;
  faq: readonly Faq[];
};

export type ResolvedPlannedPage = {
  kind: "planned";
  slug: string;
  tool: ToolConfig;
};

export type ResolvedPage = ResolvedToolPage | ResolvedPlannedPage;

export function resolveSlug(slug: string, tools: readonly RegisteredTool[] = registry): ResolvedPage | null {
  for (const tool of tools) {
    if (tool.config.slugs.includes(slug)) {
      return {
        kind: "tool",
        slug,
        config: tool.config,
        copy: tool.copy,
        Tool: tool.Tool,
        headline: titleForSlug(slug) ?? tool.copy.headline,
        faq: tool.copy.faq,
      };
    }
    const longTail = tool.copy.longTail.find((page) => page.slug === slug);
    if (longTail) {
      return {
        kind: "tool",
        slug,
        preset: longTail.preset,
        config: tool.config,
        copy: tool.copy,
        Tool: tool.Tool,
        headline: longTail.title,
        intro: longTail.intro,
        faq: longTail.faq,
      };
    }
  }
  const planned = plannedTools.find((tool) => tool.slugs.includes(slug));
  if (planned) return { kind: "planned", slug, tool: planned };
  return null;
}

export function staticSlugs(tools: readonly RegisteredTool[] = registry): string[] {
  const slugs = new Set<string>();
  for (const tool of plannedTools) {
    for (const slug of tool.slugs) slugs.add(slug);
  }
  for (const tool of tools) {
    for (const slug of tool.config.slugs) slugs.add(slug);
    for (const slug of tool.config.seoPages) slugs.add(slug);
    for (const page of tool.copy.longTail) slugs.add(page.slug);
  }
  return [...slugs];
}

export function relatedTools(currentId: string): ToolConfig[] {
  return shellTools().filter((tool) => tool.id !== currentId).slice(0, 3);
}
