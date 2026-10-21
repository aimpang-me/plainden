import { expect, test } from "vitest";
import { isEmailAddress } from "./email";

test("an email needs a local part, a domain, and a dot", () => {
  expect(isEmailAddress("ada@example.com")).toBe(true);
  expect(isEmailAddress("  ada@example.com  ")).toBe(true);
  expect(isEmailAddress("ada@example")).toBe(false);
  expect(isEmailAddress("ada.example.com")).toBe(false);
  expect(isEmailAddress("@example.com")).toBe(false);
  expect(isEmailAddress("ada @example.com")).toBe(false);
});
