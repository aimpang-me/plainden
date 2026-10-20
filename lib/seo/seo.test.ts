import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { resolveSlug, staticSlugs } from "@/lib/pages/resolve";
import { buildRobots, buildSitemap, jsonLdScript, metadataFor, sitemapXml } from "./document";
import { JsonLd } from "./json-ld";
import { OgImage } from "./og-image";
import { pageByPath, parseDisabledToolIds, renderLongTail, siteOrigin } from "./pages";

const origin = "https://plainden.com";
const listed = { disabledIds: [] as const, origin };

test("the sitemap lists every page the site already resolves", () => {
  const paths = new Set<string>(["/", "/pricing"]);
  for (const slug of staticSlugs()) {
    if (resolveSlug(slug)) paths.add(`/${slug}`);
  }
  const xml = sitemapXml(listed);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs.sort()).toEqual([...paths].map((path) => `${origin}${path}`).sort());
  expect(xml).toContain("<loc>https://plainden.com/</loc>");
  expect(xml).toContain("<loc>https://plainden.com/pricing</loc>");
  expect(xml).toContain("<loc>https://plainden.com/invoice-generator</loc>");
  expect(xml).toContain("<loc>https://plainden.com/scaffold-check-limit</loc>");
  expect(xml).toContain("<loc>https://plainden.com/privacy-policy-generator</loc>");
  expect(xml).toContain("<loc>https://plainden.com/refund-policy-generator</loc>");
});

test("a disabled tool id leaves the sitemap and stays noindex", () => {
  const ids = parseDisabledToolIds("invoice, pdf");
  expect(ids).toEqual(["invoice", "pdf"]);
  const xml = sitemapXml({ disabledIds: ids, origin });
  expect(xml).not.toContain("https://plainden.com/invoice-generator");
  expect(xml).not.toContain("https://plainden.com/merge-pdf");
  expect(xml).toContain("https://plainden.com/receipt-generator");
  expect(xml).toContain("https://plainden.com/qr-code-generator");
  const hidden = pageByPath("/invoice-generator", { disabledIds: ids, origin });
  expect(hidden?.index).toBe(false);
  expect(metadataFor(hidden!, origin).robots).toEqual({ index: false, follow: true });
});

test("a long-tail page uses its own title, intro, and faq", () => {
  const page = renderLongTail("scaffold-check-limit", listed);
  expect(page).toMatchObject({
    kind: "long-tail",
    path: "/scaffold-check-limit",
    title: "Scaffold limit check",
    description: "A count of 4 is over the free limit of 3.",
    toolId: "scaffold",
  });
  const script = jsonLdScript(page!, origin);
  expect(script).toContain("What count is blocked?");
  expect(script).toContain("4 or more on the free plan.");
  expect(script).not.toContain("What does this page check?");
  expect(script).toContain("SoftwareApplication");
  expect(script).toContain("FAQPage");
  expect(script).toContain("BreadcrumbList");
  expect(metadataFor(page!, origin).alternates).toEqual({ canonical: "https://plainden.com/scaffold-check-limit" });
  expect(metadataFor(page!, origin).openGraph).toMatchObject({
    images: [{ url: "https://plainden.com/scaffold-check-limit/opengraph-image", width: 1200, height: 630 }],
  });
});

test("a primary tool page keeps the tool faq and a planned page has no faq", () => {
  const tool = pageByPath("/scaffold-check", listed);
  expect(jsonLdScript(tool!, origin)).toContain("What does this page check?");
  const planned = pageByPath("/privacy-policy-generator", listed);
  expect(planned).toMatchObject({ kind: "planned", title: "Privacy policy generator", toolId: "legal" });
  const plannedScript = jsonLdScript(planned!, origin);
  expect(plannedScript).toContain("SoftwareApplication");
  expect(plannedScript).toContain("BreadcrumbList");
  expect(plannedScript).not.toContain("FAQPage");
  expect(plannedScript).toContain('"price":"0.00"');
  expect(plannedScript).toContain('"price":"5.00"');
});

test("home and pricing metadata stay on the plainden origin", () => {
  const home = pageByPath("/", listed);
  expect(home).toMatchObject({
    kind: "home",
    description: "Small browser tools with a free limit and a $5 monthly plan.",
  });
  expect(metadataFor(home!, origin).title).toEqual({ absolute: "plainden" });
  expect(jsonLdScript(home!, origin)).toContain("WebSite");
  expect(jsonLdScript(home!, origin)).not.toContain("SoftwareApplication");
  const pricing = pageByPath("/pricing", listed);
  expect(metadataFor(pricing!, origin)).toMatchObject({
    title: "Pricing",
    alternates: { canonical: "https://plainden.com/pricing" },
    openGraph: { images: [{ url: "https://plainden.com/opengraph-image", width: 1200, height: 630 }] },
  });
  expect(buildSitemap(listed).find((entry) => entry.url === "https://plainden.com/pricing")).toEqual({
    url: "https://plainden.com/pricing",
    changeFrequency: "monthly",
    priority: 0.4,
  });
  expect(buildRobots({ origin })).toEqual({
    rules: { userAgent: "*", allow: "/", disallow: "/account" },
    sitemap: "https://plainden.com/sitemap.xml",
  });
});

test("the default tool list hides unbuilt tools and keeps the built ones", () => {
  const previous = process.env.TOOLS_DISABLED;
  delete process.env.TOOLS_DISABLED;
  const xml = sitemapXml({ origin });
  if (previous === undefined) delete process.env.TOOLS_DISABLED;
  else process.env.TOOLS_DISABLED = previous;
  expect(xml).toContain("https://plainden.com/invoice-generator");
  expect(xml).toContain("https://plainden.com/merge-pdf");
  expect(xml).toContain("https://plainden.com/qr-code-generator");
  expect(xml).toContain("https://plainden.com/receipt-generator");
  expect(xml).not.toContain("https://plainden.com/privacy-policy-generator");
  expect(xml).not.toContain("https://plainden.com/scaffold-check");
  expect(xml).not.toContain("https://plainden.com/compress-image");
  expect(pageByPath("/merge-pdf", { origin })?.title).toBe("Merge PDF");
  expect(pageByPath("/terms-and-conditions-generator", { origin })?.title).toBe("Terms and conditions generator");
});

test("unknown paths and primary slugs are not long-tail pages", () => {
  expect(pageByPath("/no-such-page", listed)).toBeNull();
  expect(renderLongTail("scaffold-check", listed)).toBeNull();
  expect(renderLongTail("missing-tail", listed)).toBeNull();
});

test("a disabled long-tail page is noindex and absent from the sitemap", () => {
  const page = renderLongTail("scaffold-check-count", { disabledIds: ["scaffold"], origin });
  expect(page?.index).toBe(false);
  expect(sitemapXml({ disabledIds: ["scaffold"], origin })).not.toContain("scaffold-check");
  expect(sitemapXml({ disabledIds: ["scaffold"], origin })).toContain("https://plainden.com/invoice-generator");
});

test("site origin falls back when the value is empty or not http", () => {
  expect(siteOrigin("https://plainden.com/")).toBe("https://plainden.com");
  expect(siteOrigin("")).toBe("https://plainden.com");
  expect(siteOrigin("plainden.com")).toBe("https://plainden.com");
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    expect(siteOrigin()).toBe("https://plainden.com");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test("json-ld escapes a less-than sign and the og card shows the page title", () => {
  const page = pageByPath("/", listed);
  const hostile = { ...page!, description: "a < b" };
  const script = jsonLdScript(hostile, origin);
  expect(script).toContain("\\u003c");
  expect(script.includes("<")).toBe(false);
  const markup = renderToStaticMarkup(
    createElement(JsonLd, { page: page!, origin }),
  );
  expect(markup).toContain("application/ld+json");
  expect(markup).toContain("WebSite");
  const card = renderToStaticMarkup(
    createElement(OgImage, {
      title: "Scaffold limit check",
      description: "A count of 4 is over the free limit of 3.",
    }),
  );
  expect(card).toContain("Scaffold limit check");
  expect(card).toContain("plainden");
  expect(card).toContain("#1d4ed8");
});
