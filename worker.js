/**
 * Cloudflare Worker Proxy for ServiceSync.io
 * Proxies requests to hornhausventures.com/servicesync while rewriting URLs
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Configuration
    const TARGET_DOMAIN = 'hornhausventures.com';
    const TARGET_PATH_PREFIX = '/servicesync';
    const PROXY_DOMAIN = url.hostname; // servicesync.io or frazierhorn.com
    
    try {
      // Build the target URL
      const targetUrl = new URL(request.url);
      targetUrl.hostname = TARGET_DOMAIN;
      
      // Map root requests to the servicesync subpage
      if (targetUrl.pathname === '/' || targetUrl.pathname === '') {
        targetUrl.pathname = TARGET_PATH_PREFIX;
      } else {
        // Prepend the target path prefix to other requests
        targetUrl.pathname = TARGET_PATH_PREFIX + targetUrl.pathname;
      }
      
      // Create new request with modified headers
      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      });
      
      // Add/modify headers for the upstream request
      modifiedRequest.headers.set('Host', TARGET_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Host', PROXY_DOMAIN);
      modifiedRequest.headers.set('X-Forwarded-Proto', 'https');
      
      // Fetch from the target
      const response = await fetch(modifiedRequest);
      
      // Handle redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          const redirectUrl = new URL(location, targetUrl);
          if (redirectUrl.hostname === TARGET_DOMAIN) {
            // Rewrite redirect to proxy domain
            redirectUrl.hostname = PROXY_DOMAIN;
            redirectUrl.pathname = redirectUrl.pathname.replace(TARGET_PATH_PREFIX, '');
            return Response.redirect(redirectUrl.toString(), response.status);
          }
        }
      }
      
      // Clone response to modify
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // Modify response headers
      modifiedResponse.headers.set('X-Proxy-By', 'Cloudflare-Worker');
      modifiedResponse.headers.delete('X-Frame-Options');
      modifiedResponse.headers.delete('Content-Security-Policy');
      
      // Process HTML content
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const rewrittenHtml = rewriteHtmlContent(html, TARGET_DOMAIN, PROXY_DOMAIN, TARGET_PATH_PREFIX);
        
        return new Response(rewrittenHtml, {
          status: response.status,
          statusText: response.statusText,
          headers: modifiedResponse.headers
        });
      }
      
      return modifiedResponse;
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy Error: ' + error.message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

/**
 * Rewrite HTML content to replace target domain references with proxy domain
 */
function rewriteHtmlContent(html, targetDomain, proxyDomain, targetPathPrefix) {
  let rewritten = html;
  
  // Rewrite canonical URLs
  rewritten = rewritten.replace(
    new RegExp(`<link([^>]*?)rel=["']canonical["']([^>]*?)href=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<link$1rel="canonical"$2href="https://${proxyDomain}$3"$4>`
  );
  
  // Rewrite meta og:url
  rewritten = rewritten.replace(
    new RegExp(`<meta([^>]*?)property=["']og:url["']([^>]*?)content=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']([^>]*?)>`, 'gi'),
    `<meta$1property="og:url"$2content="https://${proxyDomain}$3"$4>`
  );
  
  // Rewrite absolute links to the target domain
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `href="$1"`
  );
  
  // Rewrite absolute links to target domain root that should go to proxy
  rewritten = rewritten.replace(
    new RegExp(`href=["']https?://${targetDomain}["']`, 'gi'),
    `href="/"`
  );
  
  // Rewrite src attributes for assets
  rewritten = rewritten.replace(
    new RegExp(`src=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `src="$1"`
  );
  
  // Rewrite action attributes in forms
  rewritten = rewritten.replace(
    new RegExp(`action=["']https?://${targetDomain}${targetPathPrefix}([^"']*?)["']`, 'gi'),
    `action="$1"`
  );
  
  // Add base tag if not present to handle relative URLs correctly
  if (!rewritten.includes('<base')) {
    rewritten = rewritten.replace(
      /<head>/i,
      `<head>\n  <base href="https://${proxyDomain}/">`
    );
  }
  
  // Inject additional meta tags for SEO
  const seoInjection = `
  <meta name="robots" content="index, follow">
  <link rel="dns-prefetch" href="//${proxyDomain}">
  `;
  
  rewritten = rewritten.replace(/<\/head>/i, `${seoInjection}</head>`);
  
  return rewritten;
}
