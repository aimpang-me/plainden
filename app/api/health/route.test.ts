import { expect, test } from "vitest";
import { GET } from "./route";

test("health answers without a database", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
