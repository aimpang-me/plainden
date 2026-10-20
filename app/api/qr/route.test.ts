import { expect, test } from "vitest";
import { POST } from "./route";

test("a signed-out qr write is unauthorized before the body is parsed", async () => {
  const posted = await POST(
    new Request("http://127.0.0.1/api/qr", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: "{",
    }),
  );
  expect(posted.status).toBe(401);
  expect(await posted.json()).toEqual({
    ok: false,
    code: "signed-out",
    reason: "Sign in to publish a dynamic code.",
  });
});
