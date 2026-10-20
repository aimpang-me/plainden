# Requests

F8 should import `securityHeaders` from `lib/security/csp.ts` and set those headers in `proxy.ts`. Also import `unenforcedRateLimit` and `rateLimitFlag` from `lib/security/rateLimit.ts`. Do not put a process-wide counter in `proxy.ts`. Leave `rateLimitFlag.enforced` false until a shared store exists.

When PostHog or Sentry scripts are added, add their hosts to the directive list in `lib/security/csp.ts`. Then run `node --experimental-strip-types scripts/deploy/check-headers.ts` and update `vercel.json` so the check stays green.

Create the legal pages at `/terms`, `/privacy`, and `/refund`. `PADDLE-SETUP.md` sends the owner to those paths.
