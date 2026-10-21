import { expect, test } from "vitest";
import { sidebarAccountLabel } from "./sidebar-account";

test("the sidebar names the signed-in email and says Sign in when there is no session", () => {
  expect(sidebarAccountLabel("ada@example.com")).toBe("ada@example.com");
  expect(sidebarAccountLabel(null)).toBe("Sign in");
  expect(sidebarAccountLabel("  ")).toBe("Sign in");
});
