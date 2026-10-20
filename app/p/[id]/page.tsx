import { connection } from "next/server";
import { notFound } from "next/navigation";
import { isPolicyPublicId } from "@/tools/legal/public-id";
import { readPublished } from "@/tools/legal/publish";

export const instant = false;

export default async function Page(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  if (!isPolicyPublicId(id)) notFound();
  await connection();
  const published = await readPublished(id);
  if (!published) notFound();
  return <article className="whitespace-pre-wrap">{published.text}</article>;
}
