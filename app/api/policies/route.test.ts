import { expect, test } from "vitest";
import { POST } from "./route";

test("a signed-out policy write is refused", async () => {
  const posted = await POST(new Request("http://127.0.0.1/api/policies", { method: "POST", body: "{}" }));
  expect(posted.status).toBe(401);
  expect(await posted.json()).toEqual({ error: "sign in required" });
});
