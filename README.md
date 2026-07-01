# ServiceSync Proxy Worker

Cloudflare Worker that serves `servicesync.io` by proxying content from `luumis.ai/servicesync/`. Visitors see `servicesync.io` in their browser — no redirect, no URL change.

## How It Works

```
Browser -> https://servicesync.io/
  -> Cloudflare Worker intercepts (route: servicesync.io/*)
  -> Fetches https://luumis.ai/servicesync/
  -> Rewrites HTML (canonical, OG, nav links -> servicesync.io)
  -> Serves to visitor with servicesync.io URLs throughout
```

### URL Mapping

| Visitor sees | Worker fetches |
|--------------|----------------|
| servicesync.io/ | luumis.ai/servicesync/ |
| servicesync.io/audit/ | luumis.ai/servicesync/audit/ |
| servicesync.io/dealers/ | luumis.ai/servicesync/dealers/ |
| servicesync.io/investors/ | luumis.ai/servicesync/investors/ |
| servicesync.io/press/ | luumis.ai/servicesync/press/ |
| servicesync.io/assets/* | luumis.ai/servicesync/assets/* |

### What Gets Rewritten

- `<link rel="canonical">` URLs
- Open Graph (`og:url`) tags
- Twitter Card URLs
- Internal navigation links
- JavaScript domain references
- Form action URLs

## Project Structure

```
servicesync-proxy-worker/
├── worker.js          Cloudflare Worker (main logic)
├── wrangler.toml      Deployment config (routes, env vars)
├── package.json       Dependencies (wrangler CLI)
├── CHANGELOG.md       Version history
└── README.md          This file
```

## Configuration

### wrangler.toml

```toml
name = "servicesync-proxy"
main = "worker.js"

[[routes]]
pattern = "servicesync.io/*"
zone_name = "servicesync.io"

[[routes]]
pattern = "www.servicesync.io/*"
zone_name = "servicesync.io"

[vars]
TARGET_DOMAIN = "luumis.ai"
TARGET_PATH = "/servicesync"
```

### Cloudflare Zone

- Zone: servicesync.io
- Zone ID: 19554d383464b0845fb58bcffc1bcf30
- Account: fhorn@hornhausventures.com
- SSL Mode: Flexible (S3 origins are HTTP-only)

## Deployment

```bash
cd ~/Development/LocalProjects/Professional/servicesync-proxy-worker
npx wrangler deploy
```

Deploys immediately to Cloudflare's edge. Changes are live in seconds.

### Local Development

```bash
npx wrangler dev
# Worker runs locally at http://localhost:8787
```

## Origin Site

The actual HTML/CSS/assets live in the `luumis-sites` repo:
- Repo: `ServiceSync-AI/luumis-sites`
- Path: `luumis.ai/servicesync/`
- Deployed to: S3 bucket `luumis.ai` via GitHub Actions

When you push changes to `luumis-sites`, both `luumis.ai/servicesync/` AND `servicesync.io` get updated (since this Worker proxies from the same origin).

## SEO

- Google indexes `servicesync.io` as the primary domain (canonical URLs point there)
- `luumis.ai/servicesync/` is the same content but canonical points to servicesync.io
- No duplicate content penalty since canonical is consistent
- `X-Proxy-By: ServiceSync-Worker` header added for debugging

## Subdomains (Not Affected)

This Worker only intercepts `servicesync.io/*` and `www.servicesync.io/*`. All subdomains are independent:

- stratus.servicesync.io -> S3
- go.servicesync.io -> S3 + Cloudflare Access
- press.servicesync.io -> S3
- console.servicesync.io -> CloudFront
- track.servicesync.io -> CloudFront
- api.servicesync.io -> API Gateway
- n8n.servicesync.io -> EC2

## Troubleshooting

### 302 redirect loop
S3 returns trailing-slash redirects for directories. The Worker follows these internally. If you see a loop, check the internal redirect-follow logic in `worker.js`.

### 525 SSL Handshake Failed
Zone SSL mode must be Flexible for S3 origins. Workers bypass this for their own fetches, but the DNS fallback (if Worker is disabled) needs Flexible.

### Assets not loading
Asset paths get prefixed with `/servicesync/` when fetched from origin. Check browser DevTools network tab.

### Verifying Worker is active
```bash
curl -sI https://servicesync.io/ | grep x-proxy-by
# x-proxy-by: ServiceSync-Worker
```

## Related Repos

| Repo | What |
|------|------|
| ServiceSync-AI/luumis-sites | Origin HTML/CSS (S3 deployed) |
| ServiceSync-AI/servicesync-sites | Other servicesync.io subdomains (stratus, press, go) |

## History

- **v1.0** (2026-05): Initial Worker, proxied from hornhausventures.com/servicesync (Webflow)
- **v2.0** (2026-07-01): Switched origin to luumis.ai/servicesync/ (S3), fixed trailing-slash redirect loop, added www route

## License

MIT
