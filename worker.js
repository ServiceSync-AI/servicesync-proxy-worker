/**
 * Cloudflare Worker Proxy for ServiceSync.io
 * Proxies requests to luumis.ai/servicesync/ while keeping servicesync.io in the browser.
 * Updated 2026-07-01: switched origin from hornhausventures.com (Webflow, dead) to luumis.ai (S3 via Cloudflare).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Configuration
    const TARGET_DOMAIN = 'luumis.ai';
    const TARGET_PATH_PREFIX = '/servicesync';
    const PROXY_DOMAIN = url.hostname; // servicesync.io or www.servicesync.io
    
    try {
      // Build the target URL for the origin (luumis.ai)
      const targetUrl = new URL(request.url);
      targetUrl.hostname = TARGET_DOMAIN;
      
      // Map all requests to the servicesync subpage structure
      if (targetUrl.pathname === '/' || targetUrl.pathname === '') {
        targetUrl.pathname = TARGET_PATH_PREFIX + '/';
      } else {
        // For page requests and assets
        if (isAssetRequest(targetUrl.pathname)) {
          // Keep asset paths under /servicesync/assets/
          targetUrl.pathname = TARGET_PATH_PREFIX + targetUrl.pathname;
        } else {
          // For page requests, prepend the target path
          targetUrl.pathname = TARGET_PATH_PREFIX + targetUrl.pathname;
        }
      }
      
      // Create new request with proper headers
      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.body,
        redirect: 'manual'
      });
      
      // Set headers for the origin
      modifiedRequest.headers.set('Host', TARGET_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Host', PROXY_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Proto', 'https');
      modifiedRequest.headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
      modifiedRequest.headers.set('User-Agent', request.headers.get('User-Agent') || 'CloudflareWorker/1.0');
      
      // Fetch from origin
      const response = await fetch(modifiedRequest);
      
      // Handle redirects from origin
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          const redirectUrl = new URL(location, targetUrl);
          if (redirectUrl.hostname === TARGET_DOMAIN || redirectUrl.hostname === '') {
            // If it's a same-origin redirect (e.g. trailing slash /servicesync → /servicesync/)
            // follow it internally rather than sending back to client
            const followUrl = new URL(redirectUrl.toString());
            if (!followUrl.hostname || followUrl.hostname === TARGET_DOMAIN) {
              followUrl.hostname = TARGET_DOMAIN;
              followUrl.protocol = 'https:';
            }
            const followRequest = new Request(followUrl.toString(), {
              method: request.method,
              headers: new Headers(request.headers),
              redirect: 'manual'
            });
            followRequest.headers.set('Host', TARGET_DOMAIN);
            const followResponse = await fetch(followRequest);
            
            // If we still get a redirect after following once, rewrite for client
            if (followResponse.status >= 300 && followResponse.status < 400) {
              const loc2 = followResponse.headers.get('Location');
              if (loc2) {
                const redir2 = new URL(loc2, followUrl);
                // Strip TARGET_PATH_PREFIX and rewrite to proxy domain
                let newPath = redir2.pathname;
                if (newPath.startsWith(TARGET_PATH_PREFIX)) {
                  newPath = newPath.slice(TARGET_PATH_PREFIX.length) || '/';
                }
                return Response.redirect(`https://${PROXY_DOMAIN}${newPath}`, followResponse.status);
              }
            }
            
            // Process the followed response normally
            const followHeaders = new Headers(followResponse.headers);
            followHeaders.set('X-Proxy-By', 'ServiceSync-Worker');
            followHeaders.delete('X-Frame-Options');
            followHeaders.delete('Content-Security-Policy');
            
            const followContentType = followResponse.headers.get('Content-Type') || '';
            if (followContentType.includes('text/html')) {
              const html = await followResponse.text();
              const rewrittenHtml = rewriteContent(html, TARGET_DOMAIN, PROXY_DOMAIN, TARGET_PATH_PREFIX);
              return new Response(rewrittenHtml, {
                status: followResponse.status,
                statusText: followResponse.statusText,
                headers: followHeaders
              });
            }
            return new Response(followResponse.body, {
              status: followResponse.status,
              statusText: followResponse.statusText,
              headers: followHeaders
            });
          }
          // External redirect — pass through as-is
          return Response.redirect(location, response.status);
        }
      }
      
      // Create response with modified headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Proxy-By', 'ServiceSync-Worker');
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Content-Security-Policy');
      
      // Process HTML content
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const rewrittenHtml = rewriteContent(html, TARGET_DOMAIN, PROXY_DOMAIN, TARGET_PATH_PREFIX);
        
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
  const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.mp4', '.webm'];
  return assetExtensions.some(ext => pathname.toLowerCase().endsWith(ext)) || 
         pathname.includes('/assets/') || 
         pathname.includes('/uploads/') ||
         pathname.includes('/static/');
}

/**
 * Rewrite HTML content to use the proxy domain
 */
function rewriteContent(html, targetDomain, proxyDomain, targetPathPrefix) {
  let rewritten = html;
  
  // 1. Rewrite canonical URLs to use proxy domain
  rewritten = rewritten.replace(
    new RegExp(`<link([^>]*?)rel=["']canonical["']([^>]*?)href=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<link$1rel="canonical"$2href="https://${proxyDomain}$3"$4>`
  );
  
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
  
  // 5. Rewrite any links to the target domain root
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}["']`, 'gi'),
    `href="/"`
  );
  
  // 6. Handle form actions
  rewritten = rewritten.replace(
    new RegExp(`action=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `action="$1"`
  );
  
  // 7. Handle remaining absolute URLs to target domain in hrefs
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}([^"']*?)["']`, 'gi'),
    (match, path) => {
      if (path.startsWith(targetPathPrefix)) {
        return `href="${path.replace(targetPathPrefix, '') || '/'}"`;
      }
      return `href="${path}"`;
    }
  );
  
  // 8. Update JS domain references
  rewritten = rewritten.replace(
    new RegExp(`(['"\`])https?://${targetDomain}${targetPathPrefix}([^'"\`]*?)(['"\`])`, 'gi'),
    `$1$2$3`
  );
  
  // 9. Add SEO meta tags
  const seoTags = `
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow">
  <link rel="dns-prefetch" href="//${proxyDomain}">
  <meta property="og:site_name" content="ServiceSync AI">
  `;
  
  rewritten = rewritten.replace(/<\/head>/i, `${seoTags}</head>`);
  
  return rewritten;
}
