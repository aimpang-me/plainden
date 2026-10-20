import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  for (const header of securityHeaders(mode)) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
