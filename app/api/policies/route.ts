import { getCurrentUser } from "@/lib/auth/get-current-user";
import { clientAddress, takeRateLimit } from "@/lib/security/enforce-rate-limit";
import { originAllowed } from "@/lib/security/origin";
import { parseJsonBody, policyWriteLimit, readLimitedBody } from "@/lib/security/body";
import { publish, readOwned, toPolicyResponse } from "@/tools/legal/publish";

export const instant = false;

export async function POST(request: Request): Promise<Response> {
  const limited = await takeRateLimit("write", clientAddress(request.headers));
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign in required" }, { status: 401 });
  if (!originAllowed(request)) {
    return Response.json({ error: "forbidden", message: "Cross-origin write refused." }, { status: 403 });
  }
  const body = await readLimitedBody(request, policyWriteLimit);
  if (!body.ok) return Response.json({ error: "too-large", message: "Request body is too large." }, { status: 413 });
  return toPolicyResponse(await publish(user.id, parseJsonBody(body.text)));
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign in required" }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  const owned = await readOwned(user.id, kind);
  if (!owned) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(owned);
}
