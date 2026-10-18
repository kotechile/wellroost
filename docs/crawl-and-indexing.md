# Crawling and indexing

Everything a search engine reads before it reads a page. All of it is generated at build time from
one source of truth, and all of it is asserted by `npm run check:crawl <origin>`.

## Artifacts

| Artifact | Produced by | Lives at |
|---|---|---|
| `robots.txt` | `src/pages/robots.txt.ts` | declares `Sitemap: <site>/sitemap.xml`; throws if `site` is unset rather than guessing a host |
| `sitemap-index.xml` / `sitemap-0.xml` | `@astrojs/sitemap` in `astro.config.mjs` | the URL set — auto-discovered from built pages, so a new route cannot be forgotten |
| `sitemap.xml` | `sitemapAlias()` in `astro.config.mjs` | a copy of the index at the path Search Console, Bing and every checker probe verbatim |
| `<lastmod>` | `serialize` in `astro.config.mjs` | real WordPress `modified` dates, posts only |
| canonical / OG / robots | `src/layouts/BaseLayout.astro` | derived from `Astro.url.pathname`, so a page cannot ship without one or disagree with the sitemap |
| `404.html` | `src/pages/404.astro` | served with a real 404 status by `deploy/nginx.conf` |

Posts, categories and calculators reach the sitemap automatically. Two things are deliberately kept
out: `/404` (the error page, `noindex`) and anything under `/tools/` (legacy URLs that now 301).
`.env.example` documents `PUBLIC_SITE_URL` (canonical origin) and `PUBLIC_WORDPRESS_API_BASE`.

## Verify

```bash
npm run build
npm run check:crawl http://localhost:8080     # against the built image, before deploying
npm run check:crawl https://wellroost.com     # against production, after deploying
```

The gate fails on: a missing or empty sitemap, a `Sitemap:` line that does not resolve, a sitemap
chunk that 404s, an advertised URL that redirects or carries `noindex`, no article or calculator
coverage, an unknown URL answering anything but 404, or a canonical pointing at a foreign host.

Run it against **nginx, not `python3 -m http.server`** — a generic static server answers 200 for
unknown paths and for Astro's redirect shims, which produces false results in both directions.

## Deploying

The Coolify deploy webhook has no valid API token, so a push to `main` does **not** deploy. GitHub
reports it directly:

```bash
gh api repos/kotechile/wellroost/hooks/678313349/deliveries \
  --jq '.[0] | {delivered_at, status, status_code}'   # → 401 Invalid HTTP Response
```

Until that is repaired in Coolify (regenerate the deploy webhook, update the GitHub hook secret),
deploys are manual: Coolify → the wellroost app → Redeploy. A green local build proves the repo,
never the live site — re-run the gate against the public origin afterwards.

## IndexNow (Bing / Yandex)

Bing finds new articles by recrawling `sitemap.xml` (hours to days). IndexNow pushes them in
minutes. The key is public by design and served from `public/<key>.txt`; `scripts/indexnow.mjs`
holds the matching key and refuses to submit if the live key file is missing or different.

```bash
npm run indexnow -- --dry-run         # what would be submitted
npm run indexnow                      # posts modified in the last 2 days
npm run indexnow -- --since 7         # wider window after a missed run
npm run indexnow -- --all             # every published post
```

It reads the URL set from WordPress `modified_after`, not from a local build, so it can run anywhere
with network access and needs no state. Run it **after** the deploy is live. Schedule it (Coolify
scheduled task, Hermes cron, or a laptop cron) at most once a day.

## Known gaps

- **`www.wellroost.com`** CNAMEs to this host but the edge has no router or certificate for it, so
  `https://www` fails the TLS handshake and `http://www` answers 404. `deploy/nginx.conf` has the
  301-to-apex block; it takes effect once `www.wellroost.com` is added as an app domain in Coolify.
- **Hub pages carry no `lastmod`.** Home, `/about`, `/calculators` and category pages have no
  trustworthy modified date, and a fabricated one is what broke `lastmod` in the first place.
