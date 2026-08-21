/** @type {import('next').NextConfig} */

// Applied to every response. The app renders no third-party embeds and loads no
// remote scripts, so the policy can stay tight; 'unsafe-inline' on style-src is
// required by Next's inlined critical CSS.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next injects inline bootstrap scripts; eval is needed by the dev overlay only.
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // DEPLOYMENT SAFETY: Do NOT add these - they break static asset serving (404 + wrong MIME):
  // - output: "export" (static export; use SSR)
  // - assetPrefix (breaks /_next/static/* on some hosts)
  // - rewrites that capture /_next/* or /api/*
};

module.exports = nextConfig;
