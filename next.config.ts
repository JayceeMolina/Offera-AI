// NEXT.JS CONFIGURATION
// Global Next.js config file.
// Sets HTTP security headers on every page/route.
// Hides source maps in production to protect source code.
// These headers protect users from common web attacks like
// clickjacking, XSS, MIME sniffing, and unauthorized resource access.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides source code from browser devtools in production
  productionBrowserSourceMaps: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevents the site from being embedded in iframes (clickjacking)
        { key: "X-Frame-Options", value: "DENY" },
        // Prevents browsers from guessing file types (MIME sniffing attacks)
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Controls how much referrer info is shared when navigating
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Blocks access to camera, microphone, and geolocation
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // Enables browser's built-in XSS filter
        { key: "X-XSS-Protection", value: "1; mode=block" },
      ],
    },
  ],
};

export default nextConfig;