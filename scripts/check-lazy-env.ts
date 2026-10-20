import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["lib/db", "lib/payments", "lib/auth"];

export function topLevelEnvLines(source: string): number[] {
  const lines = source.split("\n");
  let depth = 0;
  let inBlock = false;
  const hits: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    let code = stripStrings(lines[index] ?? "");
    if (inBlock) {
      const end = code.indexOf("*/");
      if (end === -1) continue;
      inBlock = false;
      code = code.slice(end + 2);
    }
    const blockStart = code.indexOf("/*");
    if (blockStart !== -1 && !code.includes("*/", blockStart + 2)) {
      code = code.slice(0, blockStart);
      inBlock = true;
    } else {
      code = code.replace(/\/\*[\s\S]*?\*\//g, "");
    }
    code = code.replace(/\/\/.*$/, "");
    const at = code.indexOf("process.env");
    if (at !== -1) {
      const depthAt = depth + braceDelta(code.slice(0, at));
      if (depthAt === 0) hits.push(index + 1);
    }
    depth += braceDelta(code);
  }
  return hits;
}

function stripStrings(line: string): string {
  return line.replace(/'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`/g, '""');
}

function braceDelta(code: string): number {
  let delta = 0;
  for (const char of code) {
    if (char === "{") delta += 1;
    if (char === "}") delta -= 1;
  }
  return delta;
}

function walk(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

export function serverClientEnvHits(cwd = process.cwd()): { file: string; lines: number[] }[] {
  const hits = [];
  for (const root of roots) {
    for (const file of walk(path.join(cwd, root))) {
      const lines = topLevelEnvLines(readFileSync(file, "utf8"));
      if (lines.length > 0) hits.push({ file, lines });
    }
  }
  return hits;
}
