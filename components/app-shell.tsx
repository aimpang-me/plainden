"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
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

const drawerMove = { duration: 0.22, ease: "easeOut" } as const;

export function AppShell({ tools, children }: { tools: readonly ShellTool[]; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const current = crumbLabel(pathname, tools);

  useEffect(() => {
    setSlot(slotRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <ActionSlotContext.Provider value={slot}>
        <div className="min-h-screen overflow-x-clip bg-app min-[901px]:grid min-[901px]:grid-cols-[232px_minmax(0,1fr)] min-[901px]:items-start">
          <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-panel px-2.5 py-3.5 min-[901px]:flex">
            <Sidebar tools={tools} pathname={pathname} />
          </aside>
          <div className="flex min-h-screen min-w-0 flex-col">
            <header className="sticky top-0 z-20 flex min-h-[52px] flex-wrap items-center gap-2.5 border-b border-line bg-app px-6 py-2 max-[900px]:px-3.5">
              <button
                ref={menuRef}
                type="button"
                className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-paper min-[901px]:hidden"
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
                    <Link href="/" className="text-muted no-underline max-[900px]:hidden">
                      Tools
                    </Link>
                    <span className="text-muted max-[900px]:hidden"> › </span>
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
          <AnimatePresence>
            {open ? (
              <motion.button
                key="backdrop"
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-30 bg-ink/20 min-[901px]:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={drawerMove}
                onClick={() => setOpen(false)}
              />
            ) : null}
            {open ? (
              <motion.div
                key="drawer"
                id="app-drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-line bg-panel px-2.5 py-3.5 min-[901px]:hidden"
                initial={{ x: -232 }}
                animate={{ x: 0 }}
                exit={{ x: -232 }}
                transition={drawerMove}
              >
                <div className="mb-1 flex items-center justify-between px-2.5">
                  <p id={titleId} className="font-serif text-[17px]">
                    plainden
                  </p>
                  <button ref={closeRef} type="button" className="text-[13px] text-muted" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
                <Sidebar tools={tools} pathname={pathname} hideBrand onNavigate={() => setOpen(false)} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </ActionSlotContext.Provider>
    </MotionConfig>
  );
}

function Sidebar({
  tools,
  pathname,
  hideBrand = false,
  onNavigate,
}: {
  tools: readonly ShellTool[];
  pathname: string;
  hideBrand?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {hideBrand ? null : (
        <Link href="/" className="px-2.5 pb-3 font-serif text-[17px] text-ink no-underline" onClick={onNavigate}>
          plainden
        </Link>
      )}
      <nav aria-label="Sidebar" className="grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto">
        <p className="px-2.5 pb-1 pt-2 text-[11px] text-faint">Tools</p>
        {tools.map((tool) => {
          const active = tool.slugs.some((slug) => pathname === `/${slug}`);
          return (
            <Link
              key={tool.id}
              href={tool.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-[7px] px-2.5 py-1 text-[13px] no-underline ${
                active ? "bg-fill font-medium text-ink" : "text-muted hover:bg-fill hover:text-ink"
              }`}
            >
              <ToolIcon id={tool.id} />
              <span className="truncate">{tool.label}</span>
            </Link>
          );
        })}
        <p className="px-2.5 pb-1 pt-3 text-[11px] text-faint">Saved</p>
        <p className="px-2.5 py-1 text-[13px] text-muted">Nothing saved yet.</p>
        <Link href="/pricing" onClick={onNavigate} className="mt-2 rounded-[7px] px-2.5 py-1 text-[13px] text-ink no-underline hover:bg-fill">
          Pricing
        </Link>
      </nav>
      <Link
        href="/account"
        aria-label="Sign in"
        onClick={onNavigate}
        className="mt-auto flex items-center gap-2 border-t border-line px-2 pt-3 no-underline"
      >
        <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-fill text-[11px] font-semibold" aria-hidden="true">
          ·
        </span>
        <span>
          <span className="block text-[13px]">Sign in</span>
          <span className="block text-[11px] text-muted">Free plan</span>
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
