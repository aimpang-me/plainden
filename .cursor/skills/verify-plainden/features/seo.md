# SEO

The home page has a canonical URL and WebSite JSON-LD. `/sitemap.xml` lists the wave 1 tools and leaves out a short long-tail page. `/robots.txt` disallows every path until the site is marked public.

## Sub-features

- `seo-canonical` sets the home canonical to `https://plainden.com`.
- `seo-jsonld` embeds a WebSite node.
- `seo-sitemap` lists invoice, PDF, and QR, and omits later waves and `merge-pdf-files`.
- `seo-robots` disallows `/` and names the sitemap.

## How to get to it (user POV)

- Open `http://127.0.0.1:3100/`.
- Open `http://127.0.0.1:3100/sitemap.xml`.
- Open `http://127.0.0.1:3100/robots.txt`.

## Driving it with plainden-verify

Preconditions:

- Doctor reports the verification server at `http://127.0.0.1:3100`.
- `NEXT_PUBLIC_SITE_URL` is unset, so the origin stays `https://plainden.com`.

- **Home metadata.** Run `node .cursor/skills/verify-plainden/scripts/plainden-verify.mjs drive seo`. The canonical href is `https://plainden.com` and the JSON-LD script contains `"@type":"WebSite"`.
- **Sitemap and robots.** `GET /sitemap.xml` is 200 and contains the invoice, merge PDF, and QR locs. It does not contain privacy, merge-pdf-files, image, receipt, video, data, subtitles, or cookie. `GET /robots.txt` is 200, disallows `/`, and names `https://plainden.com/sitemap.xml`.
- **Proof.** The drive writes `evidence/seo/actions.txt`, `evidence/seo/aria.txt`, and `evidence/seo/page.png`.

## Gotchas

- The local server still advertises the production origin. That is the fallback in `siteOrigin`.
- Security headers are in `vercel.json`. This drive does not expect a Content-Security-Policy header from `next dev`.
