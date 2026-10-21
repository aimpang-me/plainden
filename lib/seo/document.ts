import type { Metadata, MetadataRoute } from "next";
import { listPages, siteIsPublic, siteOrigin, type CatalogSeoPage, type ListInput, type SeoKind, type SeoPage } from "./pages";

export function metadataFor(page: SeoPage, origin: string): Metadata {
  const canonical = `${origin}${page.path}`;
  return {
    title: page.kind === "home" ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical },
    robots: page.index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
      siteName: "plainden",
      type: "website",
      images: [{ url: `${origin}${ogPath(page)}`, width: 1200, height: 630 }],
    },
  };
}

export function jsonLd(page: SeoPage, origin: string): {
  "@context": "https://schema.org";
  "@graph": readonly Record<string, unknown>[];
} {
  const graph: Record<string, unknown>[] = [];
  switch (page.kind) {
    case "home":
      graph.push({
        "@type": "WebSite",
        name: "plainden",
        url: `${origin}/`,
        description: page.description,
      });
      break;
    case "pricing":
      graph.push(breadcrumbNode(page, origin));
      break;
    case "tool":
    case "long-tail":
    case "planned":
      graph.push(applicationNode(page, origin));
      graph.push(breadcrumbNode(page, origin));
      if (page.faq.length > 0) graph.push(faqNode(page));
      break;
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function jsonLdScript(page: SeoPage, origin: string): string {
  return JSON.stringify(jsonLd(page, origin)).replaceAll("<", "\\u003c");
}

export function buildSitemap(input: ListInput = {}): MetadataRoute.Sitemap {
  const origin = siteOrigin(input.origin);
  return listPages(input)
    .filter((page) => page.index)
    .map((page) => ({
      url: `${origin}${page.path}`,
      changeFrequency: changeFrequency(page.kind),
      priority: priority(page.kind),
    }));
}

export function sitemapXml(input: ListInput = {}): string {
  const body = buildSitemap(input)
    .map((entry) => `  <url><loc>${xmlEscape(entry.url)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobots(input: ListInput = {}): MetadataRoute.Robots {
  const open = siteIsPublic(input.sitePublic);
  return {
    rules: open
      ? { userAgent: "*", allow: "/", disallow: "/account" }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${siteOrigin(input.origin)}/sitemap.xml`,
  };
}

function ogPath(page: SeoPage): string {
  switch (page.kind) {
    case "home":
    case "pricing":
      return "/opengraph-image";
    case "tool":
    case "long-tail":
    case "planned":
      return `${page.path}/opengraph-image`;
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
}

function changeFrequency(kind: SeoKind): "weekly" | "monthly" {
  switch (kind) {
    case "home":
    case "tool":
    case "planned":
      return "weekly";
    case "pricing":
    case "long-tail":
      return "monthly";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function priority(kind: SeoKind): number {
  switch (kind) {
    case "home":
      return 1;
    case "tool":
      return 0.8;
    case "planned":
      return 0.6;
    case "long-tail":
      return 0.5;
    case "pricing":
      return 0.4;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function applicationNode(page: CatalogSeoPage, origin: string): Record<string, unknown> {
  return {
    "@type": "SoftwareApplication",
    name: page.applicationName,
    description: page.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: `${origin}${page.path}`,
    offers: page.offers.map((offer) => ({
      "@type": "Offer",
      price: offer.price,
      priceCurrency: "USD",
      name: offer.name,
    })),
  };
}

function breadcrumbNode(page: SeoPage, origin: string): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: page.crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };
}

function faqNode(page: CatalogSeoPage): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
