"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ShellTool, ShellToolId } from "@/lib/catalog/shell";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";

export type { ShellTool };

const ActionSlotContext = createContext<HTMLElement | null>(null);

export function PageActions({ children }: { children: ReactNode }) {
  const slot = useContext(ActionSlotContext);
  if (!slot) return null;
  return createPortal(children, slot);
}

const iconPaths: Record<Exclude<ShellToolId, "cookie-refund">, string> = {
  invoice: "M4 1.5h5.5L12.5 4.5v10h-8.5z M9.5 1.5v3h3 M6 8h4.5 M6 10.5h4.5",
  receipt: "M3.5 1.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z M6 5h4 M6 7.5h4",
  legal: "M8 2v12 M3 4.5h10 M3 4.5l-2 5h4z M13 4.5l-2 5h4z M5 14h6",
  pdf: "M3 1.5h7l3 3v10H3z M5.5 9h5 M5.5 11.5h3",
  qr: "M2 2h4.5v4.5H2z M9.5 2H14v4.5H9.5z M2 9.5h4.5V14H2z M9.5 9.5h2v2h-2z M12.5 12.5H14V14h-1.5z",
  image: "M1.5 2.5h13v11h-13z M1.5 11l4-4 3.5 3.5 2-2 3.5 3.5",
  video: "M1.5 3.5h9v9h-9z M10.5 7l4-2.5v7l-4-2.5",
  data: "M2 4.5h10l-2.5-2.5 M14 11.5H4l2.5 2.5",
  subtitles: "M1.5 3h13v10h-13z M4 9.5h3 M8.5 9.5h3.5 M4 7h8",
};

type StaggerWindow = {
  stepMs: number;
  enterMs: number;
  cap: number;
  windowMs: number;
};

const staggerFallback: StaggerWindow = {
  stepMs: 40,
  enterMs: 200,
  cap: 12,
  windowMs: 40 * 11 + 200,
};

function parseMilliseconds(value: string): number | null {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(ms|s)$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[2] === "s" ? amount * 1000 : amount;
}

function parseCap(value: string): number | null {
  const text = value.trim();
  if (!/^[1-9]\d*$/.test(text)) return null;
  return Number(text);
}

function readStaggerWindow(styles: CSSStyleDeclaration): StaggerWindow {
  const stepMs = parseMilliseconds(styles.getPropertyValue("--stagger-step"));
  const enterMs = parseMilliseconds(styles.getPropertyValue("--duration-enter"));
  const cap = parseCap(styles.getPropertyValue("--stagger-cap"));
  if (stepMs === null || enterMs === null || cap === null) return staggerFallback;
  if (stepMs < 30 || stepMs > 80 || enterMs < 1 || enterMs > 299) return staggerFallback;
  return { stepMs, enterMs, cap, windowMs: stepMs * (cap - 1) + enterMs };
}

function armFirstPaint(root: HTMLElement): () => void {
  const hold = readStaggerWindow(getComputedStyle(root));
  const timeout = globalThis.setTimeout(() => {
    root.dataset.entered = "";
  }, hold.windowMs);
  return () => {
    globalThis.clearTimeout(timeout);
  };
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return narrow;
}

export function AppShell({
  tools,
  planLabel,
  drawerPlanLabel,
  children,
}: {
  tools: readonly ShellTool[];
  planLabel: ReactNode;
  drawerPlanLabel: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const narrow = useNarrow();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const current = crumbLabel(pathname, tools);

  useEffect(() => {
    setSlot(slotRef.current);
  }, []);

  useEffect(() => armFirstPaint(document.documentElement), []);

  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  useEffect(() => {
    if (!open || !narrow) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      menuRef.current?.focus();
    };
  }, [open, narrow]);

  return (
    <ActionSlotContext.Provider value={slot}>
      <div
        className="shell min-h-screen overflow-x-clip bg-canvas min-[901px]:grid min-[901px]:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] min-[901px]:items-start"
        data-drawer={open ? "open" : "closed"}
      >
        <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar px-2.5 py-3.5 min-[901px]:flex">
          <Sidebar tools={tools} pathname={pathname} planLabel={planLabel} />
        </aside>
        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex min-h-[52px] flex-wrap items-center gap-2.5 border-b border-line bg-canvas px-6 py-2 max-[900px]:px-3.5">
            <button
              ref={menuRef}
              type="button"
              className="press motion-hover inline-grid h-8 w-8 place-items-center rounded-control text-text min-[901px]:hidden"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="app-drawer"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </button>
            <p className="min-w-0 truncate text-[13px]">
              {pathname === "/" ? (
                <span className="font-medium">Tools</span>
              ) : (
                <>
                  <Link href="/" className="text-secondary no-underline max-[900px]:hidden">
                    Tools
                  </Link>
                  <span className="text-secondary max-[900px]:hidden"> › </span>
                  <span className="font-medium">{current}</span>
                </>
              )}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div ref={slotRef} className="flex items-center gap-2" />
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-7 max-[900px]:px-3.5 max-[900px]:py-4">
            <main id="content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </div>
        {narrow ? (
          <>
            <button
              type="button"
              className="drawer-backdrop"
              aria-label="Close menu"
              inert={!open}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            />
            <div
              id="app-drawer"
              className="drawer flex flex-col bg-sidebar px-2.5 py-3.5"
              role={open ? "dialog" : undefined}
              aria-modal={open ? true : undefined}
              aria-labelledby={open ? titleId : undefined}
              inert={!open}
            >
              <div className="mb-1 flex items-center justify-between px-2.5">
                <p id={titleId} className="title flex items-center gap-2 text-[17px]">
                  <span className="size-[18px] shrink-0 rounded-pill bg-text" aria-hidden="true" />
                  plainden
                </p>
                <button ref={closeRef} type="button" className="press text-[13px] text-secondary" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              <Sidebar tools={tools} pathname={pathname} planLabel={drawerPlanLabel} hideBrand onNavigate={() => setOpen(false)} />
            </div>
          </>
        ) : null}
      </div>
    </ActionSlotContext.Provider>
  );
}

function Sidebar({
  tools,
  pathname,
  planLabel,
  hideBrand = false,
  onNavigate,
}: {
  tools: readonly ShellTool[];
  pathname: string;
  planLabel: ReactNode;
  hideBrand?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {hideBrand ? null : (
        <Link href="/" className="title flex items-center gap-2 px-2.5 pb-3 text-[17px] text-text no-underline" onClick={onNavigate}>
          <span className="size-[18px] shrink-0 rounded-pill bg-text" aria-hidden="true" />
          plainden
        </Link>
      )}
      <nav aria-label="Sidebar" className="grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto">
        <p className="px-2.5 pb-1 pt-2 text-[11px] text-tertiary">Tools</p>
        <div className="stagger grid gap-0.5">
          {tools.map((tool) => {
            const active = tool.slugs.some((slug) => pathname === `/${slug}`);
            return (
              <Link
                key={tool.id}
                href={tool.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`nav-link motion-hover flex items-center gap-2 px-2.5 py-1 text-[13px] no-underline ${
                  active ? "bg-hover font-medium text-text" : "text-secondary"
                }`}
              >
                <ToolIcon id={tool.id} />
                <span className="truncate">{tool.label}</span>
              </Link>
            );
          })}
        </div>
        <p className="px-2.5 pb-1 pt-3 text-[11px] text-tertiary">Saved</p>
        <p className="px-2.5 py-1 text-[13px] text-secondary">Nothing saved yet.</p>
        <Link href="/pricing" onClick={onNavigate} className="nav-link motion-hover mt-2 px-2.5 py-1 text-[13px] text-text no-underline">
          Pricing
        </Link>
      </nav>
      <Link
        href="/account"
        aria-label="Sign in"
        onClick={onNavigate}
        className="mt-auto flex items-center gap-2 px-2 pt-3 no-underline"
      >
        <span className="grid h-[26px] w-[26px] place-items-center rounded-pill bg-hover text-[11px] font-semibold" aria-hidden="true">
          ·
        </span>
        <span>
          <span className="block text-[13px]">Sign in</span>
          {planLabel}
        </span>
      </Link>
    </>
  );
}

function ToolIcon({ id }: { id: ShellToolId }) {
  if (id === "cookie-refund") {
    return (
      <svg viewBox="0 0 16 16" className="h-[15px] w-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" />
        <circle cx="6" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="10" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  const d = iconPaths[id];
  return (
    <svg viewBox="0 0 16 16" className="h-[15px] w-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function crumbLabel(pathname: string, tools: readonly ShellTool[]): string {
  if (pathname === "/") return "Tools";
  if (pathname === "/pricing") return "Pricing";
  if (pathname === "/account") return "Account";
  const tool = tools.find((item) => item.slugs.some((slug) => pathname === `/${slug}`));
  if (tool) return tool.label;
  const slug = pathname.slice(1);
  if (!slug || slug.includes("/")) return "plainden";
  return slug.replaceAll("-", " ");
}
