import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getEntitlement } from "@/lib/entitlements/get-entitlement";

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return Response.json({ error: "invalid", message: "key is required" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ entitlementKey: key, plan: "free" });
  return Response.json(await getEntitlement({ userId: user.id }, key));
}
