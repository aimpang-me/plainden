import { expect, test } from "vitest";
import { formatFileSize } from "./format-size";

test("file sizes use a short unit", () => {
  expect(formatFileSize(512)).toBe("512 B");
  expect(formatFileSize(1536)).toBe("1.5 KB");
  expect(formatFileSize(25 * 1024 * 1024)).toBe("25 MB");
});
