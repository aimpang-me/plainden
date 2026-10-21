import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { isPolicyPublicId } from "@/tools/legal/public-id";
import { readPublished } from "@/tools/legal/publish";

export const instant = false;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  if (!isPolicyPublicId(id)) notFound();
  await connection();
  const published = await readPublished(id);
  if (!published) notFound();
  return (
    <article className="surface whitespace-pre-wrap p-5 text-[15px] leading-7">
      {published.text}
    </article>
  );
}
