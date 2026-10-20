import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { plannedTools } from "../lib/catalog/planned.ts";
import type { ToolConfig, ToolCopy } from "../lib/contract/types.ts";
import { priceByLookupKey } from "../lib/pricing/catalog.ts";

const root = process.cwd();
const toolsDir = path.join(root, "tools");
const outputPath = path.join(toolsDir, "registry.generated.ts");

type SlugGroup = { id: string; slugs: string[] };

export function assertUniqueSlugs(groups: readonly SlugGroup[]): void {
  const owner = new Map<string, string>();
  for (const group of groups) {
    for (const slug of group.slugs) {
      const previous = owner.get(slug);
      if (previous) throw new Error(`duplicate slug ${slug}`);
      owner.set(slug, group.id);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string, id: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${id} ${key} must be a non-empty string`);
  }
  return value;
}

function readSlugList(value: unknown, id: string, key: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${id} ${key} must be a list of slugs`);
  }
  return value;
}

export function validateToolModule(config: ToolConfig, copy: ToolCopy): void {
  if (config.slugs.length === 0) throw new Error(`${config.id} needs a slug`);
  if (copy.faq.length < 6) throw new Error(`${config.id} faq needs 6, got ${copy.faq.length}`);
  if (copy.longTail.length < 5) {
    throw new Error(`${config.id} longTail needs 5, got ${copy.longTail.length}`);
  }
  for (const item of copy.faq) {
    if (!item.question || !item.answer) throw new Error(`${config.id} faq entry is empty`);
  }
  for (const page of copy.longTail) {
    if (!page.slug || !page.title || !page.intro) throw new Error(`${config.id} longTail entry is incomplete`);
  }
  if (!priceByLookupKey(config.priceLookupKey)) {
    throw new Error(`${config.id} priceLookupKey ${config.priceLookupKey} is not in the price catalog`);
  }
  assertUniqueSlugs([{ id: config.id, slugs: routableSlugs(config, copy) }]);
}

export function routableSlugs(config: ToolConfig, copy: ToolCopy): string[] {
  return [...config.slugs, ...copy.longTail.map((page) => page.slug)];
}

function toolIds(): string[] {
  if (!statSync(toolsDir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(toolsDir)
    .filter((name) => statSync(path.join(toolsDir, name)).isDirectory())
    .filter((name) => statSync(path.join(toolsDir, name, "config.ts"), { throwIfNoEntry: false })?.isFile())
    .sort();
}

async function loadNamedExport(file: string, name: string): Promise<unknown> {
  const loaded = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  return loaded[name];
}

function asConfig(value: unknown, id: string): ToolConfig {
  if (!isRecord(value)) throw new Error(`${id} config must be an object`);
  return {
    id: readString(value, "id", id),
    name: readString(value, "name", id),
    slugs: readSlugList(value.slugs, id, "slugs"),
    title: readString(value, "title", id),
    description: readString(value, "description", id),
    entitlementKey: readString(value, "entitlementKey", id),
    priceLookupKey: readString(value, "priceLookupKey", id),
    limits: value.limits as ToolConfig["limits"],
    seoPages: readSlugList(value.seoPages, id, "seoPages"),
  };
}

function asCopy(value: unknown, id: string): ToolCopy {
  if (!isRecord(value)) throw new Error(`${id} copy must be an object`);
  const faq = value.faq;
  const longTail = value.longTail;
  const steps = value.steps;
  if (!Array.isArray(faq) || !Array.isArray(longTail) || !Array.isArray(steps)) {
    throw new Error(`${id} copy is missing steps, faq, or longTail`);
  }
  return value as ToolCopy;
}

export async function generateRegistry(): Promise<void> {
  const ids = toolIds();
  const loaded: { id: string; config: ToolConfig; copy: ToolCopy }[] = [];
  for (const id of ids) {
    const dir = path.join(toolsDir, id);
    const config = asConfig(await loadNamedExport(path.join(dir, "config.ts"), "config"), id);
    const copy = asCopy(await loadNamedExport(path.join(dir, "copy.ts"), "copy"), id);
    if (config.id !== id) throw new Error(`${id} config id is ${config.id}`);
    validateToolModule(config, copy);
    const planned = plannedTools.find((tool) => tool.slugs.some((slug) => config.slugs.includes(slug)));
    if (planned && planned.id !== config.id) {
      throw new Error(`${id} uses a slug owned by planned tool ${planned.id}`);
    }
    loaded.push({ id, config, copy });
  }
  assertUniqueSlugs(
    loaded.map((tool) => ({
      id: tool.id,
      slugs: [...new Set([...routableSlugs(tool.config, tool.copy), ...tool.config.seoPages])],
    })),
  );
  for (const tool of plannedTools) {
    if (!priceByLookupKey(tool.priceLookupKey)) {
      throw new Error(`${tool.id} priceLookupKey ${tool.priceLookupKey} is not in the price catalog`);
    }
  }
  assertUniqueSlugs(plannedTools.map((tool) => ({ id: tool.id, slugs: [...tool.slugs, ...tool.seoPages] })));

  const imports = loaded
    .map(
      (tool) =>
        `import { config as config_${ident(tool.id)} } from "./${tool.id}/config";\nimport { copy as copy_${ident(tool.id)} } from "./${tool.id}/copy";\nimport Tool_${ident(tool.id)} from "./${tool.id}/tool";`,
    )
    .join("\n");
  const rows = loaded
    .map(
      (tool) =>
        `  { config: config_${ident(tool.id)}, copy: copy_${ident(tool.id)}, Tool: Tool_${ident(tool.id)} },`,
    )
    .join("\n");
  const source = `${imports ? `${imports}\n\n` : ""}export const registry = [\n${rows}\n];\n`;
  const previous = statSync(outputPath, { throwIfNoEntry: false })?.isFile() ? readFileSync(outputPath, "utf8") : "";
  if (previous !== source) writeFileSync(outputPath, source);
}

function ident(id: string): string {
  return id.replaceAll("-", "_");
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  generateRegistry().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
