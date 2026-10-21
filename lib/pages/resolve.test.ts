import { expect, test } from "vitest";
import { resolveSlug } from "./resolve";

test("pdf and legal slugs use distinct titles", () => {
  const merge = resolveSlug("merge-pdf");
  expect(merge?.kind).toBe("tool");
  if (merge?.kind !== "tool") throw new Error("expected merge pdf");
  expect(merge.headline).toBe("Merge PDF");
  expect(merge.preset).toBeUndefined();
  const tail = resolveSlug("merge-pdf-files");
  expect(tail?.kind).toBe("tool");
  if (tail?.kind !== "tool") throw new Error("expected a long tail");
  expect(tail.headline).toBe("Merge PDF files");
  expect(tail.preset).toBe("two");
});

test("a registered legal slug is a tool and an empty registry stays planned", () => {
  expect(resolveSlug("privacy-policy-generator")).toMatchObject({
    kind: "tool",
    headline: "Privacy policy generator",
  });
  expect(resolveSlug("privacy-policy-generator", [])).toMatchObject({
    kind: "planned",
    tool: { name: "Privacy and terms generator", id: "legal" },
  });
  expect(resolveSlug("invoice-generator")?.kind).toBe("tool");
  expect(resolveSlug("no-such-page")).toBeNull();
});
