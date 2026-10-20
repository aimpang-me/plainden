import type { Faq, RegisteredTool } from "@/lib/contract/types";
import { priceByLookupKey } from "@/lib/pricing/catalog";
import { resolveSlug, staticSlugs, type ResolvedPage } from "@/lib/pages/resolve";
import { registry } from "@/tools/registry.generated";

const DEFAULT_ORIGIN = "https://plainden.com";

const HOME_DESCRIPTION = "Small browser tools with a free limit and a $5 monthly plan.";

const PRICING_DESCRIPTION =
  "Annual prices are 10 times the monthly price. Receipt shares the invoice plan. Cookie and refund share the legal plan.";

export type Crumb = { name: string; path: string };

export type Offer = { price: string; name: string };

type SeoPageBase = {
  path: string;
  title: string;
  description: string;
  index: boolean;
  crumbs: readonly Crumb[];
};

export type StaticSeoPage = SeoPageBase & {
  kind: "home" | "pricing";
};

type ToolFields = {
  toolId: string;
  applicationName: string;
  faq: readonly Faq[];
  offers: readonly Offer[];
};

export type ToolSeoPage = SeoPageBase & ToolFields & { kind: "tool" };
export type LongTailSeoPage = SeoPageBase & ToolFields & { kind: "long-tail" };
export type PlannedSeoPage = SeoPageBase & ToolFields & { kind: "planned" };
export type CatalogSeoPage = ToolSeoPage | LongTailSeoPage | PlannedSeoPage;

export type SeoPage = StaticSeoPage | CatalogSeoPage;

export type SeoKind = SeoPage["kind"];

export type ListInput = {
  disabledIds?: readonly string[];
  tools?: readonly RegisteredTool[];
  origin?: string;
};

export function siteOrigin(explicit?: string): string {
  const raw = explicit !== undefined ? explicit : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return DEFAULT_ORIGIN;
}

export function parseDisabledToolIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((part) => part.trim()).filter((part) => part.length > 0))];
}

export function listPages(input: ListInput = {}): SeoPage[] {
  const disabled = new Set(input.disabledIds ?? parseDisabledToolIds(process.env.TOOLS_DISABLED));
  const tools = input.tools ?? registry;
  const pages: SeoPage[] = [homePage(), pricingPage()];
  const seen = new Set(pages.map((page) => page.path));
  for (const slug of staticSlugs(tools)) {
    const path = `/${slug}`;
    if (seen.has(path)) continue;
    const resolved = resolveSlug(slug, tools);
    if (!resolved) continue;
    seen.add(path);
    pages.push(fromResolved(resolved, disabled));
  }
  return pages;
}

export function pageByPath(path: string, input: ListInput = {}): SeoPage | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return listPages(input).find((page) => page.path === normalized) ?? null;
}

export function renderLongTail(slug: string, input: ListInput = {}): Extract<SeoPage, { kind: "long-tail" }> | null {
  const page = pageByPath(`/${slug}`, input);
  if (!page || page.kind !== "long-tail") return null;
  return page;
}

function homePage(): StaticSeoPage {
  return {
    kind: "home",
    path: "/",
    title: "plainden",
    description: HOME_DESCRIPTION,
    index: true,
    crumbs: [{ name: "plainden", path: "/" }],
  };
}

function pricingPage(): StaticSeoPage {
  return {
    kind: "pricing",
    path: "/pricing",
    title: "Pricing",
    description: PRICING_DESCRIPTION,
    index: true,
    crumbs: [
      { name: "plainden", path: "/" },
      { name: "Pricing", path: "/pricing" },
    ],
  };
}

function fromResolved(page: ResolvedPage, disabled: ReadonlySet<string>): CatalogSeoPage {
  switch (page.kind) {
    case "planned":
      return {
        kind: "planned",
        path: `/${page.slug}`,
        title: page.tool.name,
        description: page.tool.description,
        index: !disabled.has(page.tool.id),
        crumbs: [
          { name: "plainden", path: "/" },
          { name: page.tool.name, path: `/${page.slug}` },
        ],
        toolId: page.tool.id,
        applicationName: page.tool.name,
        faq: [],
        offers: offersFor(page.tool.priceLookupKey),
      };
    case "tool":
      return fromRegistered(page, disabled);
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
}

function fromRegistered(
  page: Extract<ResolvedPage, { kind: "tool" }>,
  disabled: ReadonlySet<string>,
): ToolSeoPage | LongTailSeoPage {
  const primary = page.config.slugs[0] ?? page.slug;
  const shared = {
    path: `/${page.slug}`,
    title: page.headline,
    description: page.intro ?? page.config.description,
    index: !disabled.has(page.config.id),
    toolId: page.config.id,
    applicationName: page.config.name,
    faq: page.faq,
    offers: offersFor(page.config.priceLookupKey),
  };
  const parent: Crumb[] = [
    { name: "plainden", path: "/" },
    { name: page.config.name, path: `/${primary}` },
  ];
  if (page.config.slugs.includes(page.slug)) {
    return { kind: "tool", crumbs: parent, ...shared };
  }
  return {
    kind: "long-tail",
    crumbs: [...parent, { name: page.headline, path: `/${page.slug}` }],
    ...shared,
  };
}

function offersFor(lookupKey: string): Offer[] {
  const offers: Offer[] = [{ price: "0.00", name: "Free" }];
  const paid = priceByLookupKey(lookupKey);
  if (paid && paid.amountCents > 0 && paid.interval === "month") {
    offers.push({ price: (paid.amountCents / 100).toFixed(2), name: paid.name });
  }
  return offers;
}
