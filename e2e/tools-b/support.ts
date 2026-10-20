import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

export const fixtures = path.join(process.cwd(), "e2e/tools-b/fixtures");

export const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
] as const;

export async function openTool(page: Page, route: string, unbuiltReason: string): Promise<void> {
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const unbuilt = await page.getByText("This tool is not built yet.").isVisible();
  const missing = await page.getByRole("heading", { name: "Page not found" }).isVisible();
  if (unbuilt || missing) test.fixme(true, unbuiltReason);
}

export async function downloadFile(page: Page, timeout = 20_000): Promise<{ name: string; bytes: Buffer }> {
  const link = page.locator("main a[download]").first();
  await expect(link).toBeVisible({ timeout });
  const name = await link.getAttribute("download");
  const href = await link.getAttribute("href");
  if (name === null || name.length === 0 || href === null || href.length === 0) {
    throw new Error("download link has no name or href");
  }
  const raw = await page.evaluate(async (url) => {
    const response = await fetch(url);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }, href);
  return { name, bytes: Buffer.from(raw) };
}

export async function expectFits(locator: Locator, viewportWidth: number): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box === null) throw new Error("control has no box");
  expect(Math.round(box.x)).toBeGreaterThanOrEqual(0);
  expect(Math.round(box.x + box.width)).toBeLessThanOrEqual(viewportWidth);
}
