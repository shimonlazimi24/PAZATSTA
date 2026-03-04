/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  // DEPLOYMENT SAFETY: Do NOT add these - they break static asset serving (404 + wrong MIME):
  // - output: "export" (static export; use SSR)
  // - assetPrefix (breaks /_next/static/* on some hosts)
  // - rewrites that capture /_next/* or /api/*
};

module.exports = nextConfig;
