import { expect, test } from "vitest";
import { welcomeText } from "./welcome";

test("the welcome note names the account and the legal pages", () => {
  const message = welcomeText("ada@example.com");
  expect(message.subject).toBe("Welcome to plainden");
  expect(message.text).toContain("ada@example.com");
  expect(message.text).toContain("https://plainden.com/terms");
  expect(message.text).toContain("https://plainden.com/privacy");
  expect(message.text).toContain("https://plainden.com/refund");
  expect(message.text).not.toMatch(/[—–]/);
});
