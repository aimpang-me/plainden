import Link from "next/link";

export default function NotFound() {
  return (
    <article className="grid gap-3">
      <h1 className="text-3xl">Page not found</h1>
      <Link href="/">Back to plainden</Link>
    </article>
  );
}
