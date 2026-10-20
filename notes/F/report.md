F-a covers F1 through F4 and CONTRACT.md.
`next build` and `eslint .` pass with no environment variables set.
Vitest covers slugs, limits, PGlite inserts, the payments stub, and lazy env reads.
Playwright covers `/scaffold-check`, the invoice placeholder, pricing, and the theme toggle.
`getCurrentUser` returns null. Payments throw `PaymentsNotConfigured`. `checkLimit` does not store usage.
`useEntitlement` always returns the free plan. The scaffold tool is the only built tool.
Planned tools render `This tool is not built yet.` Neon, Stripe, and magic-link auth are not wired.
Proof screenshots are in `.cursor/skills/verify-plainden/evidence/scaffold-tool/`.
AGENTS.md still has em dashes because `next dev` rewrites that file.
