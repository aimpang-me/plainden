import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-8 py-7 text-[13px] text-faint max-[800px]:flex-col max-[800px]:items-start max-[800px]:px-5">
        <p>plainden</p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refund">Refunds</Link>
        </nav>
        <a href="mailto:support@plainden.com">support@plainden.com</a>
      </div>
    </footer>
  );
}
