import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("policy proxy", () => {
  it("returns 404 for a policy id that is not 32 hex digits", () => {
    const response = proxy(new NextRequest("http://127.0.0.1:3100/p/not-a-policy"));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-security-policy")).toContain("script-src");
    expect(response.headers.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("lets a 32 hex policy id through", () => {
    const response = proxy(new NextRequest(`http://127.0.0.1:3100/p/${"ab".repeat(16)}`));
    expect(response.status).toBe(200);
  });
});
