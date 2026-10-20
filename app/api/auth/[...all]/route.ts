import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";

async function handler(request: Request): Promise<Response> {
  const auth = await getAuth();
  const routed = toNextJsHandler(auth);
  if (request.method === "POST") return routed.POST(request);
  return routed.GET(request);
}

export { handler as GET, handler as POST };
