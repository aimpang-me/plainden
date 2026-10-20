import { getCurrentUser } from "@/lib/auth/get-current-user";
import { originAllowed, parseJsonBody, qrWriteLimit, readLimitedBody } from "@/lib/security/origin";
import { parseCommand } from "@/tools/qr/contract";
import { handle } from "@/tools/qr/saved";

export const instant = false;

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, code: "signed-out", reason: "Sign in to publish a dynamic code." },
      { status: 401 },
    );
  }
  if (!originAllowed(request)) {
    return Response.json({ ok: false, code: "invalid", reason: "Cross-origin write refused." }, { status: 403 });
  }
  const body = await readLimitedBody(request, qrWriteLimit);
  if (!body.ok) {
    return Response.json({ ok: false, code: "invalid", reason: "Request body is too large." }, { status: 413 });
  }
  const parsed = parseCommand(parseJsonBody(body.text));
  if (!parsed.ok) return Response.json(parsed, { status: 400 });
  const result = await handle(user, parsed.command);
  return Response.json(result);
}
