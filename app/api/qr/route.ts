import { getCurrentUser } from "@/lib/auth/get-current-user";
import { parseCommand } from "@/tools/qr/contract";
import { handle } from "@/tools/qr/saved";

export const instant = false;

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = parseCommand(body);
  if (!parsed.ok) return Response.json(parsed, { status: 400 });
  const result = await handle(user, parsed.command);
  return Response.json(result);
}
