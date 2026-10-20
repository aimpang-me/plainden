import { expect, test } from "vitest";
import { POST } from "./route";

test("policy routes ask for a sign in while auth is a stub", async () => {
  const posted = await POST(new Request("http://127.0.0.1/api/policies", { method: "POST", body: "{}" }));
  expect(posted.status).toBe(401);
  expect(await posted.json()).toEqual({ error: "sign in required" });
});
