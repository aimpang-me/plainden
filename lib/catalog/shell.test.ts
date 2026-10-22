import { expect, test } from "vitest";
import { shellToolOrder, shellTools } from "./shell";
import { disabledToolIds } from "./visibility";

test("an unset switch shows every tool and a list hides the named ids", () => {
  expect(disabledToolIds(undefined)).toEqual([]);
  expect(disabledToolIds("")).toEqual([]);
  expect(disabledToolIds("none")).toEqual([]);
  expect(shellTools().map((tool) => tool.id)).toEqual([...shellToolOrder]);
  expect(shellTools("").map((tool) => tool.id)).toEqual([...shellToolOrder]);
  expect(shellTools("none").map((tool) => tool.id)).toEqual([...shellToolOrder]);
  expect(shellTools("image, legal, receipt, video, data, subtitles, cookie-refund").map((tool) => tool.id)).toEqual([
    "invoice",
    "pdf",
    "qr",
  ]);
  expect(shellTools("invoice").map((tool) => tool.id)).not.toContain("invoice");
  expect(shellTools("invoice").map((tool) => tool.id)).toContain("pdf");
});
