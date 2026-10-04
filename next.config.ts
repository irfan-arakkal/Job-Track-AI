import type { NextConfig } from "next";

/**
 * Security headers for every response (the per-request Content Security Policy is added in
 * src/proxy.ts because it needs a fresh nonce).
 */
const securityHeaders = [
  // Don't let the browser guess content types (stops e.g. an upload being run as HTML/JS).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Our pages may not be embedded in frames on other sites (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send only the origin to other sites, never full URLs that could contain ids.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Turn off powerful browser features we don't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Isolate our window from cross-origin popups.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HTTPS only, for two years (ignored by browsers on plain-HTTP localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an `X-Powered-By` header.
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (Phase 15).
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
