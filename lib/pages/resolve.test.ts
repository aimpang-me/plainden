import { expect, test } from "vitest";
import { resolveSlug } from "./resolve";

test("scaffold-check resolves to the registered tool", () => {
  const page = resolveSlug("scaffold-check");
  expect(page?.kind).toBe("tool");
  if (page?.kind !== "tool") throw new Error("expected the scaffold tool");
  expect(page.headline).toBe("Scaffold check");
  expect(page.preset).toBeUndefined();
});

test("a long tail slug carries its preset", () => {
  const page = resolveSlug("scaffold-check-limit");
  expect(page).toMatchObject({
    kind: "tool",
    headline: "Scaffold limit check",
    preset: "Limit preset",
    intro: "A count of 4 is over the free limit of 3.",
  });
});

test("pdf and legal slugs use distinct titles", () => {
  const merge = resolveSlug("merge-pdf");
  expect(merge?.kind).toBe("tool");
  if (merge?.kind !== "tool") throw new Error("expected merge pdf");
  expect(merge.headline).toBe("Merge PDF");
  const tail = resolveSlug("merge-pdf-files");
  expect(tail?.kind).toBe("tool");
  if (tail?.kind !== "tool") throw new Error("expected a long tail");
  expect(tail.headline).toBe("Merge PDF files");
});

test("a planned slug renders the placeholder data", () => {
  expect(resolveSlug("privacy-policy-generator")).toMatchObject({
    kind: "planned",
    tool: { name: "Privacy and terms generator", id: "legal" },
  });
  expect(resolveSlug("invoice-generator")?.kind).toBe("tool");
  expect(resolveSlug("no-such-page")).toBeNull();
});
