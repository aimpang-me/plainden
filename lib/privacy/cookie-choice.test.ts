import { expect, test } from "vitest";
import { readCookieChoice } from "./cookie-choice";

test("a missing cookie choice stays declined for optional cookies", () => {
  expect(readCookieChoice(null)).toBeNull();
  expect(readCookieChoice("accepted")).toBe("accepted");
  expect(readCookieChoice("declined")).toBe("declined");
  expect(readCookieChoice("yes")).toBeNull();
});
