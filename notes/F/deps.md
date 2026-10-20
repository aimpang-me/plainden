# F dependencies

`npm install pdf-lib@1.17.1 better-auth@1.7.12 drizzle-orm@0.45.4 @electric-sql/pglite@0.5.10`

pdf-lib is the shared PDF library, pinned at 1.17.1. better-auth supplies the user, session, account, and verification table shape. drizzle-orm queries PGlite. @electric-sql/pglite is the local Postgres.

`npm install -D @types/node@22.20.5 vitest@5.0.5 @playwright/test@1.64.1 drizzle-kit@0.31.11`

@types/node 22 matches the Vitest 5 peer range. Vitest runs logic tests. @playwright/test is pinned at 1.64.1 for shared browser tests. drizzle-kit is installed for F-d and was not run.

Next.js 16.4.2, React 19.3.0, and eslint-config-next 16.4.2 came from `create-next-app@16.4.2`.

`npm install stripe@18.5.0 resend@6.1.2 @neondatabase/serverless@1.0.1`

stripe creates Checkout and Billing Portal sessions and verifies webhook signatures. resend sends mail when `EMAIL_TRANSPORT` is not `file`. It is in `serverExternalPackages` because the production build cannot resolve the optional `@react-email/render` import. `@neondatabase/serverless` is the Neon HTTP driver used when `DATABASE_URL` is set and `PGLITE_DATA_DIR` is unset. `scripts/stripe/sync-prices.ts` was not executed.
