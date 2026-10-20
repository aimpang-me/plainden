import Link from "next/link";

export default function NotFound() {
  return (
    <article className="grid gap-6 text-center">
      <h1 className="text-[56px] font-medium leading-[1.05] tracking-[-0.035em] max-[800px]:text-[38px]">Page not found</h1>
      <Link href="/">Back to plainden</Link>
    </article>
  );
}
