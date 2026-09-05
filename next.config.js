/** @type {import('next').NextConfig} */

// COOKIE_SECRET signs session cookies and hashes OTPs. If it is missing the app
// cannot authenticate anyone, so fail the build rather than shipping a deploy that
// 500s at request time. Vercel exposes environment variables during the build, so
// a misconfigured project is caught here instead of by customers.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-development-server") {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "COOKIE_SECRET is missing or shorter than 32 characters. " +
        "Set it in the deployment environment before building. " +
        "Generate one with: openssl rand -base64 48"
    );
  }
  for (const name of ["CRON_SECRET", "ADMIN_NOTIFICATION_EMAILS", "RESEND_API_KEY", "APP_URL"]) {
    if (!process.env[name]?.trim()) {
      // Not fatal — the app serves pages without these — but each one silently
      // disables something: crons, admin notifications, or outbound mail.
      console.warn(`[config] ${name} is not set. See docs/DEPLOYMENT.md.`);
    }
  }
}

const isProd = process.env.NODE_ENV === "production";

// Teacher avatars may be absolute URLs stored in the database (see TeacherAvatar),
// so img-src has to allow https. Everything else the app loads is same-origin:
// fonts are self-hosted by next/font and there are no third-party scripts.
const csp = [
  "default-src 'self'",
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // No includeSubDomains and no preload: preload is effectively irreversible, and
  // includeSubDomains would cover sibling hosts on the apex domain that may not
  // serve HTTPS. Widen these only after auditing every subdomain.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  // Report-Only first. The policy above is believed complete, but this app is live;
  // watch the browser console for violations on the booking flow, the teacher pages
  // and the admin dashboard, then rename this key to "Content-Security-Policy" to
  // enforce it. Enforcing also activates frame-ancestors, so confirm first that no
  // marketing page embeds the app in an iframe.
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
