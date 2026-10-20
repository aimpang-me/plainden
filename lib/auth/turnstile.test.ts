import { afterEach, expect, test } from "vitest";
import { turnstileSecret } from "./server";

let previousNodeEnv: string | undefined;
let previousSecret: string | undefined;

afterEach(() => {
  assignEnv("NODE_ENV", previousNodeEnv);
  assignEnv("TURNSTILE_SECRET_KEY", previousSecret);
});

function assignEnv(name: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}

test("production refuses to start Turnstile without a secret", () => {
  previousNodeEnv = process.env.NODE_ENV;
  previousSecret = process.env.TURNSTILE_SECRET_KEY;
  assignEnv("NODE_ENV", "production");
  delete process.env.TURNSTILE_SECRET_KEY;
  expect(() => turnstileSecret()).toThrow("TURNSTILE_SECRET_KEY is required");
});

test("development uses the Turnstile test secret when none is set", () => {
  previousNodeEnv = process.env.NODE_ENV;
  previousSecret = process.env.TURNSTILE_SECRET_KEY;
  assignEnv("NODE_ENV", "test");
  delete process.env.TURNSTILE_SECRET_KEY;
  expect(turnstileSecret()).toBe("1x0000000000000000000000000000000AA");
});
