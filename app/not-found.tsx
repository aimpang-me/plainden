import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return (
    <article className="grid grid-cols-1 gap-4">
      <PageHeading>Page not found</PageHeading>
      <Link href="/">Back to plainden</Link>
    </article>
  );
}
