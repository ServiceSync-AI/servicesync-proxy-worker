# ServiceSync Proxy Worker

A Cloudflare Worker that proxies requests from `servicesync.io` (and later `frazierhorn.com`) to the ServiceSync subpage on `hornhausventures.com/servicesync`, while rewriting all URLs and canonical links to maintain SEO integrity.

## Features

- **Domain Proxying**: Serves content from `hornhausventures.com/servicesync` on `servicesync.io`
- **URL Rewriting**: Automatically rewrites all links, canonicals, and meta tags
- **SEO Optimization**: Maintains proper canonical URLs and meta tags for search engines
- **Asset Handling**: Properly handles CSS, JS, and image assets
- **Form Support**: Rewrites form actions to work with the proxy domain

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

Make sure you have Wrangler CLI installed and authenticated:

```bash
npm install -g wrangler
wrangler login
```

### 3. Update Configuration

Edit `wrangler.toml` to match your domain setup:

- Update `zone_name` values to match your actual domains
- Modify routes as needed
- Adjust environment variables if required

### 4. Local Development

Test the worker locally:

```bash
npm run dev
```

This will start a local development server where you can test the proxy functionality.

## Deployment

### Option 1: Deploy via Wrangler CLI

```bash
npm run deploy
```

### Option 2: Deploy via Cloudflare Dashboard (Recommended)

1. Push this repository to GitHub
2. In Cloudflare Dashboard, go to Workers & Pages
3. Click "Create Application" → "Pages" → "Connect to Git"
4. Select your GitHub repository
5. Configure build settings:
   - Build command: (leave empty)
   - Build output directory: (leave empty)
6. Deploy

### Domain Configuration

After deployment, configure your domains in Cloudflare:

1. **Add Domain to Cloudflare**: Add `servicesync.io` to your Cloudflare account
2. **Update DNS**: Point your domain to Cloudflare nameservers
3. **Configure Routes**: The worker will automatically handle routes defined in `wrangler.toml`

## How It Works

1. **Request Interception**: All requests to `servicesync.io/*` are intercepted
2. **URL Mapping**: Requests are mapped to `hornhausventures.com/servicesync/*`
3. **Content Fetching**: The worker fetches content from the target URL
4. **HTML Rewriting**: All HTML content is processed to:
   - Rewrite canonical URLs to use the proxy domain
   - Update Open Graph URLs
   - Convert absolute links to relative links
   - Handle form actions and asset URLs
5. **Response Serving**: Modified content is served to the visitor

## URL Mapping Examples

- `servicesync.io/` → `hornhausventures.com/servicesync`
- `servicesync.io/about` → `hornhausventures.com/servicesync/about`
- `servicesync.io/contact` → `hornhausventures.com/servicesync/contact`

## SEO Benefits

- **Canonical URLs**: All canonical links point to `servicesync.io`
- **Meta Tags**: Open Graph and Twitter Card URLs use the proxy domain
- **Internal Links**: All internal navigation stays within the proxy domain
- **Search Engine Friendly**: Google sees `servicesync.io` as the primary domain

## Monitoring

Monitor your worker's performance in the Cloudflare Dashboard:

- Go to Workers & Pages → Your Worker → Metrics
- Check for errors, response times, and request volume
- Use Real User Monitoring (RUM) for detailed insights

## Troubleshooting

### Common Issues

1. **404 Errors**: Check that the target path exists on `hornhausventures.com/servicesync`
2. **CSS/JS Not Loading**: Verify asset URLs are being rewritten correctly
3. **Redirect Loops**: Check for conflicting redirect rules in Cloudflare

### Debug Mode

Enable debug logging by adding console.log statements in the worker code and checking the Cloudflare Dashboard logs.

## Future Enhancements

- Add caching with KV storage for better performance
- Implement A/B testing capabilities
- Add analytics tracking
- Support for multiple target domains
- Enhanced error handling and fallbacks

## License

MIT License - see LICENSE file for details
