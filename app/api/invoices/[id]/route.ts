import { originAllowed } from "@/lib/security/origin";
import { deleteDocument, readDocument } from "@/tools/invoice/save";
import { requireUser } from "../require-user";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const document = await readDocument(gate.user.id, id);
  if (!document) return Response.json({ error: "not-found", message: "Document not found." }, { status: 404 });
  return Response.json({ ok: true, id, document });
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (!originAllowed(request)) {
    return Response.json({ error: "forbidden", message: "Cross-origin write refused." }, { status: 403 });
  }
  const { id } = await context.params;
  return Response.json(await deleteDocument(gate.user.id, id));
}
