import { expect, test } from "vitest";
import { GET as readOne } from "./[id]/route";
import { GET, POST } from "./route";

test("invoice routes ask for a sign in", async () => {
  const posted = await POST(new Request("http://127.0.0.1/api/invoices", { method: "POST", body: "{}" }));
  expect(posted.status).toBe(401);
  expect(await posted.json()).toEqual({ error: "sign in required" });

  const listed = await GET(new Request("http://127.0.0.1/api/invoices?kind=invoice"));
  expect(listed.status).toBe(401);
  expect(await listed.json()).toEqual({ error: "sign in required" });

  const loaded = await readOne(new Request("http://127.0.0.1/api/invoices/abc"), {
    params: Promise.resolve({ id: "abc" }),
  });
  expect(loaded.status).toBe(401);
  expect(await loaded.json()).toEqual({ error: "sign in required" });
});
