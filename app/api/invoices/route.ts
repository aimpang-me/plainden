import { clientAddress, takeRateLimit } from "@/lib/security/enforce-rate-limit";
import { invoiceWriteLimit, originAllowed, parseJsonBody, readLimitedBody } from "@/lib/security/origin";
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
  const limited = await takeRateLimit("write", clientAddress(request.headers));
  if (limited) return limited;
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (!originAllowed(request)) {
    return Response.json({ error: "forbidden", message: "Cross-origin write refused." }, { status: 403 });
  }
  const body = await readLimitedBody(request, invoiceWriteLimit);
  if (!body.ok) return Response.json({ error: "too-large", message: "Request body is too large." }, { status: 413 });
  return toResponse(await saveDocument(gate.user.id, parseJsonBody(body.text)));
}
