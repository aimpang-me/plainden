# SEO catalog

## Problem

plainden already resolves a slug to a tool page, a long-tail page, or a planned placeholder. Nothing builds a sitemap, JSON-LD, a canonical URL, or an OG image. S may edit only `lib/seo/`. F8 will hide tools with `TOOLS_DISABLED`, and that switch does not exist yet.

## Usage

F imports projections. `buildSitemap()` returns the Next sitemap array. `sitemapXml()` returns the same URLs as XML. `buildRobots()` points at `/sitemap.xml`. `pageByPath("/invoice-generator")` returns one `SeoPage`. `metadataFor(page, siteOrigin())` is the Next metadata object. `renderLongTail("scaffold-check-limit")` returns that page only when the slug is a long-tail entry, and null for a primary slug. `<JsonLd page={page} origin={siteOrigin()} />` prints the script. `ogImageResponse({ title, description })` returns the PNG response.

## Shape

One `SeoPage` list is the inventory. Home and pricing are static records. Every other record comes from `resolveSlug`. `kind` is `home`, `pricing`, `tool`, `long-tail`, or `planned`, each as its own object type. Sitemap, robots, metadata, and JSON-LD are functions of that list. Disabled tool ids are parsed once at the call boundary. Pages for a disabled id stay in the list with `index: false` so a route can emit `noindex`, and the sitemap drops them.

## Synthesis decision

The catalog won. A second shape, one walker per artifact, repeats the slug rules and will drift. Shipping route files inside `lib/seo` and asking F to copy them hides less and invites two copies. The public functions are the projections F calls. The page union stays inside the module.

## Tradeoffs accepted

- Planned "not built yet" pages are in the sitemap. The done line is that the sitemap lists every page, and those URLs render today.
- `tools/scaffold` is in the sitemap until F removes that folder.
- The OG card is one title and one description. It does not draw the tool UI.
- Live `/sitemap.xml` stays 404 until F adds the route files in `notes/S/requests.md`.

## Alternatives considered

Separate sitemap, metadata, and JSON-LD walkers. Each would hide its own rules and force F to keep three lists in sync. Copy-paste route files. F would own a fork of the same logic instead of an import.

## Implementation reconciliation

`next build` rejected `Extract<SeoPage, { kind: "long-tail" }>` because `kind` was a union field on one object, so the extract became `never` and the function's return collapsed to `null`. The three tool kinds are now separate object types. Call signatures did not change.

## Open questions and risks

Does F want planned placeholders out of the sitemap before launch? The current list includes them.

Is a comma-separated `TOOLS_DISABLED` the format F8 will ship? S assumed that. A different format needs a new parser only.

## Next implementation step

F adds the four route files in `notes/S/requests.md` and points `generateMetadata` at `metadataFor`.
