# S decisions

- `TOOLS_DISABLED` is not in the repo yet. The reader treats it as a comma-separated list of tool ids, trimmed, with empty pieces dropped. Unset or empty hides nothing. A listed id is left out of the sitemap and marked `noindex`. Unknown ids are ignored. Tool ids match `ToolConfig.id`, not slugs.
- Site origin is `NEXT_PUBLIC_SITE_URL` when it starts with `http://` or `https://`. Otherwise the origin is `https://plainden.com`. The value is read inside the call, not at import.
- The sitemap lists `/`, `/pricing`, and every slug `resolveSlug` returns. That includes planned placeholder pages and `tools/scaffold`. Hidden tools are the only omission.
- A long-tail breadcrumb parent is the tool's first primary slug.
- The OG card uses the light theme colors from `app/globals.css` and `fontFamily: sans-serif`. `next/og` does not use the page's system font.
- `app/` is not owned by S. Routes, metadata, and JSON-LD stay unwired until F mounts `lib/seo`. The request is `notes/S/requests.md`.
- Subagents could not start. This session wrote the module directly.
