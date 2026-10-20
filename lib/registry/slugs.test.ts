import { expect, test } from "vitest";
import { plannedTools } from "@/lib/catalog/planned";
import { assertUniqueSlugs, validateToolModule } from "../../scripts/gen-registry";
import { config } from "../../tools/scaffold/config";
import { copy } from "../../tools/scaffold/copy";
import { registry } from "../../tools/registry.generated";

test("duplicate slugs fail the registry check", () => {
  expect(() =>
    assertUniqueSlugs([
      { id: "a", slugs: ["invoice-generator"] },
      { id: "b", slugs: ["invoice-generator"] },
    ]),
  ).toThrow("duplicate slug invoice-generator");
});

test("the scaffold tool meets the copy contract", () => {
  validateToolModule(config, copy);
  expect(copy.headline).toBe("Scaffold check");
  expect(copy.faq).toHaveLength(6);
  expect(copy.longTail).toHaveLength(5);
});

test("registered slugs do not collide", () => {
  assertUniqueSlugs(
    registry.map((tool) => ({
      id: tool.config.id,
      slugs: [...tool.config.slugs, ...tool.copy.longTail.map((page) => page.slug)],
    })),
  );
  expect(registry.map((tool) => tool.config.id).sort()).toEqual(["invoice", "receipt", "scaffold"]);
});

test("receipt shares the invoice plan and legal tools share one plan", () => {
  const invoice = plannedTools.find((tool) => tool.id === "invoice");
  const receipt = plannedTools.find((tool) => tool.id === "receipt");
  const legal = plannedTools.find((tool) => tool.id === "legal");
  const cookie = plannedTools.find((tool) => tool.id === "cookie-refund");
  expect(invoice?.limits.free.perMonth).toBe(3);
  expect(receipt?.limits).toEqual(invoice?.limits);
  expect(receipt?.entitlementKey).toBe("invoice");
  expect(receipt?.priceLookupKey).toBe("plainden_invoice_month");
  expect(cookie?.limits).toEqual(legal?.limits);
  expect(cookie?.entitlementKey).toBe("legal");
});
