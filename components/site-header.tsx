import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-ink no-underline">
          plainden
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          <Link href="/pricing">Pricing</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
