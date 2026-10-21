import { expect, test } from "@playwright/test";

test("robots and the sitemap follow the private default", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /");
  expect(robotsText).not.toContain("Allow: /");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/invoice-generator");
  expect(xml).toContain("/merge-pdf");
  expect(xml).toContain("/qr-code-generator");
  expect(xml).not.toContain("/merge-pdf-files");
  expect(xml).not.toContain("/compress-image");

  await page.goto("/merge-pdf-files");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/compress-image");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/merge-pdf");
  const indexed = page.locator('meta[name="robots"]');
  if ((await indexed.count()) > 0) {
    await expect(indexed).not.toHaveAttribute("content", /noindex/);
  }
});
