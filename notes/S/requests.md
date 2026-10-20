# Requests for F

S owns `lib/seo/` only. These mounts are outside that path. Until they land, `/sitemap.xml` and `/robots.txt` 404, and pages have no canonical link or JSON-LD.

`app/sitemap.ts`

```ts
import { buildSitemap } from "@/lib/seo";

export default function sitemap() {
  return buildSitemap();
}
```

`app/robots.ts`

```ts
import { buildRobots } from "@/lib/seo";

export default function robots() {
  return buildRobots();
}
```

`app/opengraph-image.tsx`

```tsx
import { ogImageResponse } from "@/lib/seo/og-response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return ogImageResponse({
    title: "plainden",
    description: "Small browser tools with a free limit and a $5 monthly plan.",
  });
}
```

`app/[slug]/opengraph-image.tsx` should call `pageByPath("/" + slug)` and pass `title` and `description` to `ogImageResponse`. Skip the image when the path is null.

`app/page.tsx`, `app/pricing/page.tsx`, and `generateMetadata` in `app/[slug]/page.tsx` should return `metadataFor(page, siteOrigin())` from `pageByPath`. Render `<JsonLd page={page} origin={siteOrigin()} />` in the page body.

Set `NEXT_PUBLIC_SITE_URL` in production. Leave `TOOLS_DISABLED` unset until a tool should disappear from the sitemap.
