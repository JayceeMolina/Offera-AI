// NEXT.JS CONFIGURATION
// Global Next.js config file.
// Sets HTTP security headers on every page/route.
// Hides source maps in production to protect source code.

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Built as an array so each decision can carry its reasoning. Several
 * directives are looser than a textbook CSP; those are deliberate and explained
 * rather than copied from a template.
 */
const cspDirectives = [
  // Deny by default; every other directive below is an explicit exception.
  "default-src 'self'",

  // 'unsafe-inline' is required, not laziness:
  //
  //   - next-themes injects an inline <script> that sets the theme class before
  //     first paint. Without it the page flashes the wrong colour scheme.
  //   - Next.js itself emits inline bootstrap and hydration scripts
  //     (self.__next_f.push(...)).
  //
  // The correct alternative is a per-request nonce, but generating one forces
  // every route to render dynamically, and 13 of this app's 15 routes are
  // currently statically prerendered. That is a real performance and cost
  // trade-off, not a formality, so it is left as a deliberate follow-up.
  //
  // The directive is still worth enforcing: it blocks scripts from any external
  // origin, which is what stops an injected <script src="//evil"> from loading.
  //
  // 'unsafe-eval' is development-only — React Refresh and the Turbopack dev
  // runtime need it. It is never sent in production.
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",

  // 'unsafe-inline' is unavoidable here. React style attributes such as the
  // dashboard's response-rate bar (style={{ width: `${rate}%` }}) are inline
  // styles, and nonces do not apply to style *attributes* — only to <style>
  // elements. Removing this would mean rewriting every dynamic style in the app.
  "style-src 'self' 'unsafe-inline'",

  // data: covers inline SVGs and favicons; blob: covers anything generated
  // client-side.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",

  // The browser talks directly to Supabase for all job CRUD and auth, so its
  // origin must be allowed. wss: covers Realtime — unused today, but allowing it
  // now avoids a confusing breakage the first time a subscription is added.
  // The AI provider is NOT listed: OpenRouter is only ever called server-side
  // from app/api/ai, so the browser never connects to it.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",

  // The modern equivalent of X-Frame-Options: DENY. Both are sent — this one is
  // what current browsers honour, the header below covers older ones.
  "frame-ancestors 'none'",

  // Stops an injected <base> tag from silently repointing every relative URL.
  "base-uri 'self'",

  // Forms can only submit back to this origin.
  "form-action 'self'",

  // No Flash, no Java, no <embed>. Nothing here needs plugins.
  "object-src 'none'",

  // Only in production: on http://localhost this would try to upgrade dev
  // requests to https and break local development.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Produces a standalone build for Docker deployment
  output: "standalone",
  // Hides source code from browser devtools in production
  productionBrowserSourceMaps: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Restricts where scripts, styles, and connections may come from.
        { key: "Content-Security-Policy", value: cspDirectives },

        // Prevents the site from being embedded in iframes (clickjacking).
        // Retained alongside frame-ancestors for older browsers.
        { key: "X-Frame-Options", value: "DENY" },

        // Prevents browsers from guessing file types (MIME sniffing attacks)
        { key: "X-Content-Type-Options", value: "nosniff" },

        // Controls how much referrer info is shared when navigating
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

        // Blocks access to camera, microphone, and geolocation
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },

        // Forces HTTPS for two years, including subdomains.
        //
        // Not sent in development, where the app runs over plain http.
        //
        // `preload` is deliberately omitted: submitting to the browser preload
        // list is difficult to reverse and should be an explicit decision, not
        // a side effect of a config change.
        ...(isDev
          ? []
          : [{
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains",
            }]),

        // NOTE: X-XSS-Protection was removed here. It was a non-standard
        // filter that Chrome, Edge, and Safari have all deleted, and which
        // Firefox never shipped. It provided no protection while appearing to,
        // and in some historic configurations introduced vulnerabilities of its
        // own. Content-Security-Policy above is its actual replacement.
      ],
    },
  ],
};

export default nextConfig;
