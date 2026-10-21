import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";
import { takeSignInLimit } from "@/lib/security/enforce-rate-limit";

async function handler(request: Request): Promise<Response> {
  if (request.method === "POST" && new URL(request.url).pathname.endsWith("/sign-in/magic-link")) {
    const copy = request.clone();
    const body: unknown = await copy.json().catch(() => null);
    const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string" ? body.email : "";
    const limited = await takeSignInLimit(request.headers, email);
    if (limited) return limited;
  }
  const auth = await getAuth();
  const routed = toNextJsHandler(auth);
  if (request.method === "POST") return routed.POST(request);
  return routed.GET(request);
}

export { handler as GET, handler as POST };
