import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

const creamHexes = [
  "#f5f1e8",
  "#fbf9f4",
  "#fffefb",
  "#ebe6dc",
  "#e7e3db",
  "#6b6862",
  "#6f6b64",
  "#3d5a35",
  "#e4ecdf",
  "#f3e6d3",
  "#7a5520",
  "#141311",
  "#fcfaf6",
  "#1c1b19",
  "#242320",
  "#2c2a26",
  "#3a362f",
  "#b7b2a8",
  "#8c877e",
  "#c9dec4",
  "#efd3ae",
  "#2a2824",
  "#243024",
  "#3a2e22",
] as const;

const tsxBans = [
  "font-serif",
  "motion/react",
  'from "motion"',
  "from 'motion'",
  "AnimatePresence",
  "rgba(40, 30, 10",
  "rgba(40,30,10",
  "shadow-[",
  "rounded-[",
  "rounded-full",
  "bg-paid",
  "text-paid",
  "scale-[0.98]",
  "scale(0.98)",
  "easeOut",
  ...creamHexes,
] as const;

const lockedHexes = [
  "#fff",
  "#f9f9f9",
  "#0d0d0d",
  "#5d5d5d",
  "#8f8f8f",
  "#ececec",
  "#e5e5e5",
  "#212121",
  "#171717",
  "#b4b4b4",
  "#a3a3a3",
  "#2f2f2f",
] as const;

const requiredCss = [
  ...lockedHexes,
  "cubic-bezier(0.23, 1, 0.32, 1)",
  "cubic-bezier(0.32, 0.72, 0, 1)",
  "scale(0.97)",
  ".pill-due",
  "--font-serif: initial",
] as const;

const retiredColorNames = [
  "--color-app",
  "--color-panel",
  "--color-paper",
  "--color-ink",
  "--color-muted",
  "--color-faint",
  "--color-line-soft",
  "--color-fill",
  "--color-accent",
  "--color-paid",
  "--color-due",
  "--color-field",
] as const;

function walkTsx(dir: string): { path: string; text: string }[] {
  const found: { path: string; text: string }[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walkTsx(full));
      continue;
    }
    if (entry.endsWith(".tsx")) {
      found.push({ path: path.relative(root, full), text: readFileSync(full, "utf8") });
    }
  }
  return found;
}

function assertLook(sources: readonly { path: string; text: string }[], css: string): string[] {
  const violations: string[] = [];
  for (const source of sources) {
    for (const ban of tsxBans) {
      if (source.text.includes(ban)) violations.push(`${source.path} contains ${ban}`);
    }
  }
  if (css.includes("Georgia")) violations.push("app/globals.css contains Georgia");
  for (const hex of creamHexes) {
    if (css.includes(hex)) violations.push(`app/globals.css contains ${hex}`);
  }
  if (css.includes("rgba(40, 30, 10") || css.includes("rgba(40,30,10")) {
    violations.push("app/globals.css contains the brown shadow");
  }
  for (const name of retiredColorNames) {
    if (css.includes(name)) violations.push(`app/globals.css contains ${name}`);
  }
  const serifUses = css.match(/--font-serif[^;\n]*/g) ?? [];
  for (const use of serifUses) {
    if (use.trim() !== "--font-serif: initial") violations.push(`app/globals.css has ${use.trim()}`);
  }
  for (const token of requiredCss) {
    if (token === "#fff") {
      if (!/#fff(?![0-9a-fA-F])/.test(css)) violations.push("app/globals.css lacks #fff");
      continue;
    }
    if (!css.includes(token)) violations.push(`app/globals.css lacks ${token}`);
  }
  return violations;
}

it("locks the neutral look in the stylesheet", () => {
  const sources = [
    ...walkTsx(path.join(root, "app")),
    ...walkTsx(path.join(root, "components")),
    ...walkTsx(path.join(root, "tools")),
  ];
  const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
  expect(assertLook(sources, css)).toEqual([]);
});
