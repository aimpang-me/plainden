Sitemap XML lists `/`, `/pricing`, and every slug `resolveSlug` returns. Nine SEO tests pass.
`next build` passes with no app env vars. `eslint .` passes. Full `vitest run` is 25 passed.
`/sitemap.xml` and `/robots.txt` return 404. Pages have no JSON-LD and no canonical. F must mount `lib/seo`. See `notes/S/requests.md`.
`TOOLS_DISABLED` is assumed to be a comma-separated list of tool ids. Unset hides nothing.
A long-tail page uses its own title, intro, and FAQ. A disabled id is `noindex` and leaves the sitemap.
Lighthouse SEO 95+ is phase 3 and was not run.
Browser proof is verify-plainden `landing` and `scaffold-tool`. Copy at `notes/S/verify/`.
The OG route is not served. A unit test renders the card with the page title.
