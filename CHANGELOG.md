# Changelog

All notable changes to the ServiceSync Proxy Worker.

## [2.0.0] - 2026-07-01

### Changed
- **Origin switch**: `www.hornhausventures.com` (Webflow, dead) → `luumis.ai` (S3 via Cloudflare)
- Worker now fetches from `luumis.ai/servicesync/` instead of the old Webflow site
- Updated `wrangler.toml` environment variables to match

### Added
- Route for `www.servicesync.io/*` (previously only root domain was routed)
- Internal redirect following — Worker follows S3 trailing-slash redirects internally instead of bouncing the client
- This CHANGELOG

### Fixed
- **Redirect loop**: S3 returns 302 for `/servicesync` → `/servicesync/` (trailing slash). Old code rewrote this as a client redirect to `servicesync.io/` which looped. New code follows the redirect internally and serves the final response.

### Context
- The Webflow site at `hornhausventures.com` was retired in May 2026
- The ServiceSync product page was rebuilt and now lives in the `luumis-sites` repo at `luumis.ai/servicesync/`
- Between May and July 2026, `servicesync.io` used a meta-refresh redirect in an S3 bucket (URL changed in browser — not ideal)
- This deploy restores the original "no redirect" behavior where `servicesync.io` stays in the browser

### Deployment
- Worker Version ID: `a5f81b47-8c35-425f-bb0a-15c3c2325327`
- Routes: `servicesync.io/*`, `www.servicesync.io/*`
- Verified: root, /audit/, /dealers/ all return 200 with `x-proxy-by: ServiceSync-Worker`

---

## [1.1.0] - 2026-05

### Changed
- Updated TARGET_DOMAIN to use `www.hornhausventures.com` (Webflow www redirect fix)

---

## [1.0.0] - 2026-05

### Added
- Initial Cloudflare Worker proxy
- Serves `servicesync.io` by proxying Webflow at `hornhausventures.com/servicesync`
- HTML rewriting for canonical URLs, OG tags, nav links, form actions
- Asset detection to avoid double-pathing static files
- SEO meta tag injection
