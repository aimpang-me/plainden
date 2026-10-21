import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-tertiary">
      <p>plainden</p>
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refund">Refunds</Link>
      </nav>
      <a href="mailto:support@plainden.com">support@plainden.com</a>
    </footer>
  );
}
