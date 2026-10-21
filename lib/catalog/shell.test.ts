import { expect, test } from "vitest";
import { plannedTools } from "./planned";
import { shellTools } from "./shell";
import { disabledToolIds } from "./visibility";

test("an empty switch keeps the default hidden tools and none shows every tool", () => {
  expect(disabledToolIds("")).toEqual(disabledToolIds(undefined));
  expect(shellTools("").map((tool) => tool.id)).toEqual(["invoice", "pdf", "qr"]);
  expect(disabledToolIds("none")).toEqual([]);
  expect(shellTools("none")).toHaveLength(plannedTools.length);
  expect(shellTools("invoice").map((tool) => tool.id)).not.toContain("invoice");
  expect(shellTools("invoice").map((tool) => tool.id)).toContain("pdf");
});
