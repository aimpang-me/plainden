import { getCurrentUser, type CurrentUser } from "@/lib/auth/get-current-user";

export async function requireUser(): Promise<{ ok: true; user: CurrentUser } | { ok: false; response: Response }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: "sign in required" }, { status: 401 }) };
  }
  return { ok: true, user };
}
