import { expect, test } from "vitest";
import { originAllowed } from "./origin";

test("writes accept the app origin and refuse a missing or foreign origin", () => {
  const previous = process.env.PORT;
  process.env.PORT = "3100";
  const allowed = new Request("http://127.0.0.1:3100/api/invoices", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3100" },
  });
  const localhost = new Request("http://localhost:3100/api/invoices", {
    method: "POST",
    headers: { origin: "http://localhost:3100" },
  });
  const missing = new Request("http://127.0.0.1:3100/api/invoices", { method: "POST" });
  const foreign = new Request("http://127.0.0.1:3100/api/invoices", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });
  expect(originAllowed(allowed)).toBe(true);
  expect(originAllowed(localhost)).toBe(true);
  expect(originAllowed(missing)).toBe(false);
  expect(originAllowed(foreign)).toBe(false);
  if (previous === undefined) delete process.env.PORT;
  else process.env.PORT = previous;
});
