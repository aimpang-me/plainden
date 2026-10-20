import { getCurrentUser } from "@/lib/auth/get-current-user";
import { publish, readOwned, toPolicyResponse } from "@/tools/legal/publish";

export const instant = false;

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign in required" }, { status: 401 });
  return toPolicyResponse(await publish(user.id, await request.json().catch(() => null)));
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "sign in required" }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  const owned = await readOwned(user.id, kind);
  if (!owned) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(owned);
}
