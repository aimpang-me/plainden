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
    <article className="whitespace-pre-wrap rounded-[10px] border border-line bg-paper p-5 text-[15px] leading-7 shadow-[0_1px_2px_rgba(40,30,10,0.05),0_4px_14px_rgba(40,30,10,0.05)]">
      {published.text}
    </article>
  );
}
