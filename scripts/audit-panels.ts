import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { plannedTools } from "../lib/catalog/planned.ts";

const base = process.env.AUDIT_BASE ?? "http://127.0.0.1:3100";
const phase = process.env.AUDIT_PHASE ?? "before";
const outDir = process.env.AUDIT_OUT ?? path.join("/opt/cursor/artifacts/panel-audit", phase);

const scale = [4, 8, 12, 16, 24, 32] as const;
const edgeSlop = 2;
const mobileRatio = 1.6;
const stripRatio = 0.45;
const columnFraction = 0.92;

const viewports = [
  { name: "1440x900", width: 1440, height: 900, mobile: false },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
  { name: "1024x768", width: 1024, height: 768, mobile: false },
  { name: "390x844", width: 390, height: 844, mobile: true },
] as const;

type Failure = {
  viewport: string;
  route: string;
  rule: string;
  detail: string;
};

type Route = { id: string; path: string };

const routes: Route[] = [
  { id: "home", path: "/" },
  { id: "pricing", path: "/pricing" },
  { id: "account", path: "/account" },
  ...plannedTools.flatMap((tool) => tool.slugs.map((slug) => ({ id: slug, path: `/${slug}` }))),
];

const seen = new Set<string>();
const uniqueRoutes = routes.filter((route) => {
  if (seen.has(route.path)) return false;
  seen.add(route.path);
  return true;
});

async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  await page.waitForFunction(() => document.documentElement.dataset.entered === "" || document.documentElement.hasAttribute("data-entered"));
}

async function shot(page: Page, viewport: string, route: string, suffix = ""): Promise<void> {
  const name = `${viewport}/${route.replaceAll("/", "_") || "home"}${suffix}.png`;
  await page.screenshot({ path: path.join(outDir, name) });
}

type Measure = {
  failures: { rule: string; detail: string }[];
  panels: number;
};

async function measure(page: Page, mobile: boolean): Promise<Measure> {
  return page.evaluate(
    ({ mobile, scale, edgeSlop, mobileRatio, stripRatio, columnFraction }) => {
      function px(value: string): number {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }

      function box(el: Element) {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      }

      function padOf(el: Element): number[] {
        const style = getComputedStyle(el);
        return [px(style.paddingTop), px(style.paddingRight), px(style.paddingBottom), px(style.paddingLeft)];
      }

      function primaryPad(el: Element): number[] {
        const own = padOf(el);
        if (own.some((side) => side > 0.5)) return own;
        let best = own;
        let bestSum = 0;
        for (const child of el.children) {
          const pad = padOf(child);
          const sum = pad.reduce((total, side) => total + side, 0);
          if (sum > bestSum) {
            best = pad;
            bestSum = sum;
          }
        }
        return best;
      }

      function label(el: Element): string {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 42);
        const id = el.getAttribute("aria-label") ?? el.querySelector("h2")?.textContent ?? "";
        return `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")} "${(id || text).replace(/\s+/g, " ").trim().slice(0, 42)}"`;
      }

      function isDocument(el: Element): boolean {
        const style = getComputedStyle(el);
        return style.whiteSpace.startsWith("pre") || el.classList.contains("whitespace-pre-wrap");
      }

      function isForm(el: Element): boolean {
        return el.matches("form") || Boolean(el.querySelector("form, textarea, select"));
      }

      const failures: { rule: string; detail: string }[] = [];
      const main = document.querySelector("main");
      const column = main?.parentElement ?? null;
      if (!main || !column) {
        failures.push({ rule: "column", detail: "main column is missing" });
        return { failures, panels: 0 };
      }

      const columnBox = box(main);
      const gutter = padOf(column);
      if (Math.abs(gutter[1] - gutter[3]) > 0.5) {
        failures.push({ rule: "gutter", detail: `content gutter left ${gutter[3]} right ${gutter[1]}` });
      }
      for (const side of [gutter[1], gutter[3], gutter[0], gutter[2]]) {
        if (side > 0.5 && !scale.some((step) => Math.abs(side - step) <= 0.5)) {
          failures.push({ rule: "gutter", detail: `content padding ${gutter.map((n) => Math.round(n)).join("/")} is off the spacing scale` });
          break;
        }
      }

      const panels = [...main.querySelectorAll(".surface")].filter((el) => {
        if (el.parentElement?.closest(".surface")) return false;
        const rect = el.getBoundingClientRect();
        return rect.width >= 8 && rect.height >= 8;
      });

      const measured = panels.map((el) => ({ el, ...box(el), pad: primaryPad(el), form: isForm(el), document: isDocument(el) }));
      const pads = new Set(measured.map((panel) => panel.pad.map((side) => Math.round(side)).join("/")));

      for (const panel of measured) {
        const name = label(panel.el);
        for (const side of panel.pad) {
          if (side > 0.5 && !scale.some((step) => Math.abs(side - step) <= 0.5)) {
            failures.push({ rule: "padding", detail: `${name} padding ${panel.pad.map((n) => Math.round(n)).join("/")} is off the spacing scale` });
            break;
          }
        }
        if (!panel.document && !mobile && panel.height > panel.width + 1) {
          failures.push({
            rule: "portrait",
            detail: `${name} ${Math.round(panel.width)}x${Math.round(panel.height)}`,
          });
        }
        if (!panel.document && mobile && !panel.form && panel.height > panel.width * mobileRatio + 1) {
          failures.push({
            rule: "mobile-tall",
            detail: `${name} ${Math.round(panel.width)}x${Math.round(panel.height)} exceeds ${mobileRatio}x width`,
          });
        }
        if (panel.width > columnBox.width + edgeSlop) {
          failures.push({
            rule: "bleed",
            detail: `${name} width ${Math.round(panel.width)} exceeds column ${Math.round(columnBox.width)}`,
          });
        }
        if (
          !mobile &&
          !panel.document &&
          panel.width >= columnBox.width * columnFraction &&
          panel.height < panel.width * stripRatio
        ) {
          failures.push({
            rule: "strip",
            detail: `${name} ${Math.round(panel.width)}x${Math.round(panel.height)} is a full-bleed strip`,
          });
        }
      }

      if (pads.size > 1) {
        failures.push({ rule: "padding", detail: `panel padding differs across the page: ${[...pads].join(" vs ")}` });
      }

      const probe = document.createElement("div");
      const declared = getComputedStyle(document.documentElement).getPropertyValue("--panel-max").trim();
      probe.style.width = declared || "672px";
      document.body.appendChild(probe);
      const panelMax = probe.getBoundingClientRect().width || 672;
      probe.remove();
      if (!mobile) {
        for (const panel of measured) {
          if (panel.document) continue;
          if (panel.width > panelMax + edgeSlop) {
            failures.push({
              rule: "max-width",
              detail: `${label(panel.el)} width ${Math.round(panel.width)} exceeds panel max ${Math.round(panelMax)}`,
            });
          }
        }
      }

      const sorted = [...measured].sort((a, b) => a.top - b.top || a.left - b.left);
      const used = new Set<Element>();
      for (const seed of sorted) {
        if (used.has(seed.el)) continue;
        const row = [seed];
        used.add(seed.el);
        for (const other of sorted) {
          if (used.has(other.el)) continue;
          const overlap = Math.min(seed.bottom, other.bottom) - Math.max(seed.top, other.top);
          const minHeight = Math.min(seed.height, other.height);
          if (overlap > minHeight * 0.6) {
            row.push(other);
            used.add(other.el);
          }
        }
        if (row.length < 2) continue;
        const heightGap = Math.max(...row.map((panel) => panel.height)) - Math.min(...row.map((panel) => panel.height));
        const topGap = Math.max(...row.map((panel) => panel.top)) - Math.min(...row.map((panel) => panel.top));
        if (heightGap > edgeSlop || topGap > edgeSlop) {
          failures.push({
            rule: "row",
            detail: `row heights or tops differ by ${Math.round(Math.max(heightGap, topGap))}px (${row.map((panel) => label(panel.el)).join(" | ")})`,
          });
        }
      }

      for (let index = 0; index < measured.length; index += 1) {
        for (let next = index + 1; next < measured.length; next += 1) {
          const a = measured[index];
          const b = measured[next];
          if (!a || !b) continue;
          const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const minWidth = Math.min(a.width, b.width);
          if (overlap <= minWidth * 0.6) continue;
          const leftGap = Math.abs(a.left - b.left);
          const rightGap = Math.abs(a.right - b.right);
          if (leftGap > edgeSlop || rightGap > edgeSlop) {
            failures.push({
              rule: "edges",
              detail: `${label(a.el)} and ${label(b.el)} edges differ by L${Math.round(leftGap)} R${Math.round(rightGap)}`,
            });
          }
        }
      }

      const account = [...document.querySelectorAll('a[href="/account"]')].find((link) => {
        const rect = link.getBoundingClientRect();
        return rect.width > 1 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      });
      if (account) {
        const mark = account.querySelector("[aria-hidden]");
        const text = mark?.textContent?.replace(/\s+/g, "") ?? "";
        if (text === "·" || text === "•" || text === ".") {
          failures.push({ rule: "avatar", detail: "signed-out mark is a dot inside an empty circle" });
        }
      }

      return { failures, panels: measured.length };
    },
    { mobile, scale: [...scale], edgeSlop, mobileRatio, stripRatio, columnFraction },
  );
}

async function measureDrawer(page: Page): Promise<{ rule: string; detail: string }[]> {
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if ((await menu.count()) === 0) return [{ rule: "drawer", detail: "Menu button is missing" }];
  await menu.click();
  await page.waitForFunction(() => {
    const backdrop = document.querySelector(".drawer-backdrop");
    return backdrop !== null && getComputedStyle(backdrop).opacity === "1";
  });
  return page.evaluate(() => {
    const failures: { rule: string; detail: string }[] = [];
    const header = document.querySelector("header");
    const backdrop = document.querySelector(".drawer-backdrop");
    const toggle = document.querySelector("header button[aria-pressed]");
    if (!header || !backdrop || !toggle) {
      failures.push({ rule: "drawer", detail: "header, backdrop, or theme toggle is missing" });
      return failures;
    }
    const headerBox = header.getBoundingClientRect();
    const backdropBox = backdrop.getBoundingClientRect();
    const covers =
      backdropBox.left <= headerBox.left + 1 &&
      backdropBox.top <= headerBox.top + 1 &&
      backdropBox.right >= headerBox.right - 1 &&
      backdropBox.bottom >= headerBox.bottom - 1;
    const toggleBox = toggle.getBoundingClientRect();
    const hit = document.elementFromPoint(toggleBox.left + toggleBox.width / 2, toggleBox.top + toggleBox.height / 2);
    const backdropHit = hit === backdrop || backdrop.contains(hit);
    const headerStyle = getComputedStyle(header);
    const backdropStyle = getComputedStyle(backdrop);
    if (!covers || !backdropHit) {
      failures.push({
        rule: "drawer",
        detail: `overlay misses the header covers=${covers} hit=${hit?.tagName ?? "none"}.${hit?.className ?? ""} headerZ=${headerStyle.zIndex} overlayZ=${backdropStyle.zIndex} overlay=${Math.round(backdropBox.top)},${Math.round(backdropBox.left)} ${Math.round(backdropBox.width)}x${Math.round(backdropBox.height)} header=${Math.round(headerBox.top)} ${Math.round(headerBox.height)}`,
      });
    }
    const inert = header.closest("[inert]") !== null || header.hasAttribute("inert");
    if (!inert) failures.push({ rule: "drawer", detail: "header stays active while the drawer is open" });
    const account = [...document.querySelectorAll('a[href="/account"]')].find((link) => {
      const rect = link.getBoundingClientRect();
      return rect.width > 1 && rect.left >= 0 && rect.right <= window.innerWidth;
    });
    const mark = account?.querySelector("[aria-hidden]");
    const text = mark?.textContent?.replace(/\s+/g, "") ?? "";
    if (text === "·" || text === "•" || text === ".") {
      failures.push({ rule: "avatar", detail: "drawer signed-out mark is a dot inside an empty circle" });
    }
    return failures;
  });
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const viewport of viewports) mkdirSync(path.join(outDir, viewport.name), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const failures: Failure[] = [];
  let panels = 0;
  try {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of uniqueRoutes) {
        const response = await page.goto(`${base}${route.path}`, { waitUntil: "domcontentloaded" });
        const status = response?.status() ?? 0;
        if (status >= 400) {
          failures.push({ viewport: viewport.name, route: route.path, rule: "route", detail: `HTTP ${status}` });
          continue;
        }
        await settle(page);
        await shot(page, viewport.name, route.id);
        const result = await measure(page, viewport.mobile);
        panels += result.panels;
        for (const failure of result.failures) {
          failures.push({ viewport: viewport.name, route: route.path, ...failure });
        }
        if (viewport.mobile && route.path === "/") {
          const drawer = await measureDrawer(page);
          await shot(page, viewport.name, route.id, "-drawer");
          for (const failure of drawer) {
            failures.push({ viewport: viewport.name, route: route.path, ...failure });
          }
          await page.keyboard.press("Escape");
        }
      }
    }
  } finally {
    await browser.close();
  }

  const lines = failures.map((failure) => `${failure.viewport} ${failure.route} [${failure.rule}] ${failure.detail}`);
  const summary = `${phase}: ${failures.length} failures across ${uniqueRoutes.length} routes (account is the signed-out sign-in page) and ${viewports.length} viewports, ${panels} panel measurements`;
  writeFileSync(path.join(outDir, "failures.txt"), `${summary}\n${lines.join("\n")}\n`);
  writeFileSync(path.join(outDir, "failures.json"), JSON.stringify({ summary, failures }, null, 2));
  console.log(summary);
  const counts = new Map<string, number>();
  for (const failure of failures) counts.set(failure.rule, (counts.get(failure.rule) ?? 0) + 1);
  for (const [rule, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) console.log(`${rule} ${count}`);
  console.log(lines.slice(0, 40).join("\n"));
  if (failures.length > 0) process.exit(1);
}

await main();
