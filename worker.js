/**
 * Cloudflare Worker Proxy for ServiceSync.io
 * Proxies requests to hornhausventures.com/servicesync (Webflow) while keeping servicesync.io in browser
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Multi-domain configuration
    const PROXY_DOMAIN = url.hostname;
    let TARGET_DOMAIN, TARGET_PATH_PREFIX;
    
    // Configure based on the incoming domain
    if (PROXY_DOMAIN === 'servicesync.io' || PROXY_DOMAIN === 'www.servicesync.io') {
      TARGET_DOMAIN = 'www.hornhausventures.com';
      TARGET_PATH_PREFIX = '/servicesync';
    } else if (PROXY_DOMAIN === 'frazierhorn.com' || PROXY_DOMAIN === 'www.frazierhorn.com') {
      TARGET_DOMAIN = 'www.hornhausventures.com';
      TARGET_PATH_PREFIX = '/frazier-horn';
    } else {
      // Default fallback
      TARGET_DOMAIN = 'www.hornhausventures.com';
      TARGET_PATH_PREFIX = '/servicesync';
    }
    
    try {
      // Build the target URL for Webflow
      const targetUrl = new URL(request.url);
      targetUrl.hostname = TARGET_DOMAIN;
      
      // Map all requests to the servicesync subpage structure
      if (targetUrl.pathname === '/' || targetUrl.pathname === '') {
        targetUrl.pathname = TARGET_PATH_PREFIX;
      } else {
        // For Webflow, we might need to handle subpages differently
        // Check if it's an asset request or a page request
        if (isAssetRequest(targetUrl.pathname)) {
          // Keep asset paths as-is for Webflow assets
          // Don't prepend TARGET_PATH_PREFIX for assets
        } else {
          // For page requests, prepend the target path
          targetUrl.pathname = TARGET_PATH_PREFIX + targetUrl.pathname;
        }
      }
      
      // Create new request with proper headers for Webflow
      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.body,
        redirect: 'manual'
      });
      
      // Set headers that Webflow expects
      modifiedRequest.headers.set('Host', TARGET_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Host', PROXY_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Proto', 'https');
      modifiedRequest.headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
      modifiedRequest.headers.set('User-Agent', request.headers.get('User-Agent') || 'CloudflareWorker/1.0');
      
      // Fetch from Webflow
      const response = await fetch(modifiedRequest);
      
      // Handle redirects from Webflow
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          const redirectUrl = new URL(location, targetUrl);
          if (redirectUrl.hostname === TARGET_DOMAIN) {
            // Rewrite Webflow redirects to proxy domain
            redirectUrl.hostname = PROXY_DOMAIN;
            // Remove the servicesync prefix from redirects
            if (redirectUrl.pathname.startsWith(TARGET_PATH_PREFIX)) {
              redirectUrl.pathname = redirectUrl.pathname.replace(TARGET_PATH_PREFIX, '') || '/';
            }
            return Response.redirect(redirectUrl.toString(), response.status);
          }
        }
      }
      
      // Create response with modified headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Proxy-By', 'ServiceSync-Worker');
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Content-Security-Policy');
      
      // Process HTML content for Webflow
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const rewrittenHtml = rewriteWebflowContent(html, TARGET_DOMAIN, PROXY_DOMAIN, TARGET_PATH_PREFIX);
        
        return new Response(rewrittenHtml, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      }
      
      // Return other content types as-is (CSS, JS, images, etc.)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(`Proxy Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

/**
 * Check if the request is for an asset (CSS, JS, images, etc.)
 */
function isAssetRequest(pathname) {
  const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf'];
  return assetExtensions.some(ext => pathname.toLowerCase().endsWith(ext)) || 
         pathname.includes('/assets/') || 
         pathname.includes('/uploads/') ||
         pathname.includes('/_next/') ||
         pathname.includes('/static/');
}

/**
 * Rewrite HTML content specifically for Webflow sites
 * Handles Webflow's specific URL patterns and asset loading
 */
function rewriteWebflowContent(html, targetDomain, proxyDomain, targetPathPrefix) {
  let rewritten = html;
  
  // 1. Rewrite canonical URLs to use proxy domain
  rewritten = rewritten.replace(
    new RegExp(`<link([^>]*?)rel=["']canonical["']([^>]*?)href=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<link$1rel="canonical"$2href="https://${proxyDomain}$3"$4>`
  );
  
  // Also handle canonical without the path prefix
  rewritten = rewritten.replace(
    new RegExp(`<link([^>]*?)rel=["']canonical["']([^>]*?)href=["']https?://${targetDomain}["']([^>]*?)>`, 'gi'),
    `<link$1rel="canonical"$2href="https://${proxyDomain}/"$3>`
  );
  
  // 2. Rewrite Open Graph URLs
  rewritten = rewritten.replace(
    new RegExp(`<meta([^>]*?)property=["']og:url["']([^>]*?)content=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<meta$1property="og:url"$2content="https://${proxyDomain}$3"$4>`
  );
  
  rewritten = rewritten.replace(
    new RegExp(`<meta([^>]*?)property=["']og:url["']([^>]*?)content=["']https?://${targetDomain}["']([^>]*?)>`, 'gi'),
    `<meta$1property="og:url"$2content="https://${proxyDomain}/"$3>`
  );
  
  // 3. Rewrite Twitter Card URLs
  rewritten = rewritten.replace(
    new RegExp(`<meta([^>]*?)name=["']twitter:url["']([^>]*?)content=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<meta$1name="twitter:url"$2content="https://${proxyDomain}$3"$4>`
  );
  
  // 4. Rewrite navigation links that point to the servicesync section
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `href="$1"`
  );
  
  // 5. Rewrite any links that go to the main domain root to go to proxy root
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}["']`, 'gi'),
    `href="/"`
  );
  
  // 6. Handle Webflow form actions
  rewritten = rewritten.replace(
    new RegExp(`action=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `action="$1"`
  );
  
  // 7. Handle any remaining absolute URLs to the target domain in href attributes
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}([^"']*?)["']`, 'gi'),
    (match, path) => {
      // If the path starts with our target prefix, remove it
      if (path.startsWith(targetPathPrefix)) {
        return `href="${path.replace(targetPathPrefix, '') || '/'}"`;
      }
      // Otherwise, keep the path as-is (might be other parts of the site)
      return `href="${path}"`;
    }
  );
  
  // 8. Update any JavaScript that might contain domain references
  rewritten = rewritten.replace(
    new RegExp(`(['"\`])https?://${targetDomain}${targetPathPrefix}([^'"\`]*?)(['"\`])`, 'gi'),
    `$1$2$3`
  );
  
  // 9. Add SEO meta tags to ensure proper indexing
  const seoTags = `
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow">
  <link rel="dns-prefetch" href="//${proxyDomain}">
  <meta property="og:site_name" content="ServiceSync">
  `;
  
  // Insert SEO tags before closing head tag
  rewritten = rewritten.replace(/<\/head>/i, `${seoTags}</head>`);
  
  // 10. Handle any Webflow-specific asset URLs if needed
  // Webflow typically uses absolute URLs for assets, so we might need to proxy those too
  // But usually Webflow assets should load fine from their CDN
  
  return rewritten;
}
