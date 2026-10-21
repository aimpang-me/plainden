import { expect, test } from "vitest";
import { readLimitedBody } from "./body";
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

test("production writes do not trust loopback origins", () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  const loopback = new Request("https://plainden.com/api/invoices", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3100" },
  });
  const site = new Request("https://plainden.com/api/invoices", {
    method: "POST",
    headers: { origin: "https://plainden.com" },
  });
  expect(originAllowed(loopback)).toBe(false);
  expect(originAllowed(site)).toBe(true);
  if (previous === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previous;
});

test("a body larger than the cap is refused before it is kept", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(50)));
      controller.close();
    },
  });
  const request = new Request("http://127.0.0.1/api/invoices", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  expect(await readLimitedBody(request, 10)).toEqual({ ok: false });
  const small = new Request("http://127.0.0.1/api/invoices", { method: "POST", body: "{\"ok\":true}" });
  expect(await readLimitedBody(small, 100)).toEqual({ ok: true, text: "{\"ok\":true}" });
});
