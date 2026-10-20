import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security/csp";
import { isPolicyPublicId } from "@/tools/legal/public-id";

function withSecurityHeaders(response: NextResponse): NextResponse {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  for (const header of securityHeaders(mode)) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

function policyPathId(pathname: string): string | null {
  if (!pathname.startsWith("/p/")) return null;
  const id = pathname.slice("/p/".length);
  if (id.length === 0 || id.includes("/")) return null;
  return id;
}

export function proxy(request: NextRequest) {
  const id = policyPathId(request.nextUrl.pathname);
  if (id !== null && !isPolicyPublicId(id)) {
    return withSecurityHeaders(new NextResponse("Page not found", { status: 404 }));
  }
  return withSecurityHeaders(NextResponse.next({ request }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
