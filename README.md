# ServiceSync Proxy Worker

A Cloudflare Worker that proxies requests from `servicesync.io` (and later `frazierhorn.com`) to the ServiceSync page on your Webflow site at `hornhausventures.com/servicesync`, while maintaining `servicesync.io` in the browser for perfect SEO.

## Overview

This proxy allows you to serve content from your existing Webflow site under a custom domain while maintaining SEO integrity. Visitors see `servicesync.io` in their browser, but the content comes from your `hornhausventures.com/servicesync` Webflow page.

## Features

- **Seamless Domain Proxying**: Serves Webflow content on `servicesync.io`
- **SEO Optimization**: All canonical URLs, Open Graph, and meta tags use `servicesync.io`
- **Webflow Compatibility**: Preserves Webflow functionality, forms, and assets
- **URL Rewriting**: Intelligent rewriting of links and navigation
- **Asset Handling**: Proper handling of CSS, JS, images, and Webflow assets
- **Performance Optimized**: Minimal latency with Cloudflare's edge network

## How It Works

### URL Mapping
- `servicesync.io/` → `hornhausventures.com/servicesync`
- `servicesync.io/about` → `hornhausventures.com/servicesync/about`
- `servicesync.io/contact` → `hornhausventures.com/servicesync/contact`

### Browser Experience
1. User visits `servicesync.io`
2. Worker fetches content from `hornhausventures.com/servicesync`
3. HTML is rewritten to show `servicesync.io` URLs
4. User sees `servicesync.io` in browser and all navigation
5. Google indexes `servicesync.io` as the primary domain

### SEO Benefits
- **Canonical URLs**: All point to `servicesync.io`
- **Meta Tags**: Open Graph and Twitter Cards use proxy domain
- **Internal Links**: Navigation stays within `servicesync.io`
- **Search Engines**: See `servicesync.io` as the authoritative domain
- **No Duplicate Content**: Prevents SEO issues from multiple domains

## Project Structure

```
servicesync-proxy-worker/
├── worker.js          # Main Cloudflare Worker proxy logic
├── wrangler.toml      # Cloudflare Worker configuration
├── package.json       # Node.js project configuration
├── README.md          # This documentation
└── .gitignore         # Git ignore rules
```

## Setup Instructions

### Prerequisites
- Cloudflare account with your domains added
- GitHub account
- Webflow site at `hornhausventures.com/servicesync`

### 1. Repository Setup
This repository is already created and configured:
- **GitHub Repo**: https://github.com/fhorn97/servicesync-proxy-worker
- **Local Path**: `/Users/frazierhorn/servicesync-proxy-worker`

### 2. Cloudflare Deployment

#### Option A: Deploy via Cloudflare Dashboard (Recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **"Create Application"** → **"Pages"** → **"Connect to Git"**
4. Select your GitHub repository: `servicesync-proxy-worker`
5. Configure deployment settings:
   - **Project name**: `servicesync-proxy`
   - **Production branch**: `master`
   - **Build command**: (leave empty)
   - **Build output directory**: (leave empty)
6. Click **"Save and Deploy"**

#### Option B: Deploy via Wrangler CLI
```bash
cd /Users/frazierhorn/servicesync-proxy-worker
npm install -g wrangler
wrangler login
wrangler deploy
```

### 3. Domain Configuration

#### Add Domain to Cloudflare
1. In Cloudflare Dashboard, go to **"Add a Site"**
2. Enter `servicesync.io`
3. Follow the setup process to change nameservers

#### Configure DNS
1. Go to **DNS** tab for `servicesync.io`
2. Add an **A record**:
   - **Name**: `@` (root domain)
   - **IPv4 address**: `192.0.2.1` (placeholder, will be handled by Worker)
   - **Proxy status**: Proxied (orange cloud)
3. Add **CNAME record** for www:
   - **Name**: `www`
   - **Target**: `servicesync.io`
   - **Proxy status**: Proxied (orange cloud)

#### Configure Worker Routes
The routes are automatically configured in `wrangler.toml`:
- `servicesync.io/*` → Worker handles all requests
- Future: `frazierhorn.com/*` (uncomment when ready)

### 4. SSL/TLS Configuration
1. Go to **SSL/TLS** tab in Cloudflare
2. Set encryption mode to **"Full (strict)"**
3. Enable **"Always Use HTTPS"**

## Local Development

### Install Dependencies
```bash
cd /Users/frazierhorn/servicesync-proxy-worker
npm install
```

### Run Locally
```bash
npm run dev
```
This starts a local development server for testing.

### Test the Proxy
```bash
npm run test
```
Runs the worker locally without deploying.

## Configuration

### Environment Variables
Configured in `wrangler.toml`:
- `TARGET_DOMAIN`: `hornhausventures.com`
- `TARGET_PATH`: `/servicesync`

### Webflow-Specific Settings
The worker is optimized for Webflow with:
- Asset request detection
- Form action rewriting
- Webflow URL pattern handling
- SEO meta tag injection

## Code Features

### Intelligent URL Rewriting
```javascript
// Canonical URLs
<link rel="canonical" href="https://servicesync.io/about">

// Open Graph
<meta property="og:url" content="https://servicesync.io/about">

// Navigation Links
<a href="/contact">Contact</a>
```

### Asset Handling
- Webflow assets load from their CDN
- CSS and JS files work normally
- Images and fonts load correctly
- No performance impact on assets

### Form Processing
- Webflow forms submit correctly
- Form actions rewritten to proxy domain
- Maintains Webflow's form functionality

## Monitoring & Analytics

### Cloudflare Analytics
Monitor performance in Cloudflare Dashboard:
- **Workers & Pages** → **Your Worker** → **Metrics**
- View request volume, response times, errors
- Real User Monitoring (RUM) data

### Key Metrics to Watch
- **Request Volume**: Traffic to `servicesync.io`
- **Response Time**: Proxy latency
- **Error Rate**: Failed requests
- **Cache Hit Ratio**: Asset caching performance

## Troubleshooting

### Common Issues

#### 1. 404 Errors
**Problem**: Page not found on `servicesync.io`
**Solution**: 
- Verify the Webflow page exists at `hornhausventures.com/servicesync`
- Check that the page is published in Webflow
- Ensure DNS is properly configured

#### 2. CSS/JS Not Loading
**Problem**: Styling or functionality broken
**Solution**:
- Check browser console for asset loading errors
- Verify Webflow assets are accessible
- Ensure proxy isn't blocking asset requests

#### 3. Forms Not Working
**Problem**: Webflow forms not submitting
**Solution**:
- Check form action URLs are rewritten correctly
- Verify Webflow form settings
- Test form submission on original Webflow site

#### 4. Redirect Loops
**Problem**: Infinite redirects between domains
**Solution**:
- Check for conflicting redirect rules in Cloudflare
- Verify Webflow isn't redirecting back to main domain
- Review Worker redirect handling logic

### Debug Mode
Enable detailed logging by adding console.log statements in `worker.js` and checking Cloudflare Dashboard logs.

### Testing Checklist
- [ ] `servicesync.io` loads Webflow content
- [ ] URLs stay as `servicesync.io` in browser
- [ ] Navigation links work correctly
- [ ] Forms submit successfully
- [ ] Assets (CSS/JS/images) load properly
- [ ] SEO tags show `servicesync.io`
- [ ] Mobile responsiveness maintained

## SEO Verification

### Check Canonical URLs
```bash
curl -s https://servicesync.io | grep canonical
```

### Verify Meta Tags
```bash
curl -s https://servicesync.io | grep -E "(og:url|twitter:url)"
```

### Google Search Console
1. Add `servicesync.io` to Google Search Console
2. Submit sitemap (if available from Webflow)
3. Monitor indexing status
4. Check for crawl errors

## Future Enhancements

### Performance Optimizations
- [ ] Add KV storage for caching
- [ ] Implement edge-side includes (ESI)
- [ ] Add response compression
- [ ] Optimize asset delivery

### Advanced Features
- [ ] A/B testing capabilities
- [ ] Analytics integration
- [ ] Custom error pages
- [ ] Multi-language support
- [ ] Advanced caching strategies

### Additional Domains
- [ ] Enable `frazierhorn.com` proxy
- [ ] Add subdomain support
- [ ] Implement domain-specific customizations

## Deployment History

### Version 1.0 (Initial)
- Basic proxy functionality
- URL rewriting for SEO
- Webflow compatibility

### Version 1.1 (Current)
- Enhanced Webflow integration
- Improved asset handling
- Better SEO optimization
- Form processing improvements

## Support

### Resources
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Webflow Help Center](https://webflow.com/help)
- [GitHub Repository](https://github.com/fhorn97/servicesync-proxy-worker)

### Making Changes
1. Edit code locally in `/Users/frazierhorn/servicesync-proxy-worker`
2. Test changes with `npm run dev`
3. Commit and push to GitHub
4. Cloudflare automatically deploys from `master` branch

### Contact
For issues or questions about this proxy setup, check the GitHub repository issues or Cloudflare support.

## License

MIT License - This project is open source and available for modification and distribution.
