import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header>
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-8 py-5 max-[800px]:px-5">
        <Link href="/" className="text-[18px] font-semibold tracking-[-0.02em] text-ink no-underline">
          plainden
        </Link>
        <nav aria-label="Main" className="flex items-center gap-7 text-sm max-[800px]:gap-4">
          <Link href="/#tools" className="inline-flex h-12 items-center text-ink no-underline">
            Tools
          </Link>
          <Link href="/pricing" className="inline-flex h-12 items-center text-ink no-underline max-[800px]:hidden">
            Pricing
          </Link>
          <ThemeToggle />
          <Link
            href="/account"
            className="inline-flex h-12 items-center rounded-full bg-fill px-[18px] text-sm font-medium text-ink no-underline"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
