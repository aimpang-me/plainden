import { listDocuments, saveDocument, toResponse } from "@/tools/invoice/save";
import type { ToolId } from "@/tools/invoice/month-count";
import { requireUser } from "./require-user";

function kindFrom(request: Request): ToolId | null {
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind === "invoice" || kind === "receipt") return kind;
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const kind = kindFrom(request);
  if (!kind) return Response.json({ error: "invalid", message: "kind must be invoice or receipt." }, { status: 400 });
  const documents = await listDocuments(gate.user.id, kind);
  return Response.json({ ok: true, documents });
}

export async function POST(request: Request): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const payload = await request.json().catch(() => null);
  return toResponse(await saveDocument(gate.user.id, payload));
}
