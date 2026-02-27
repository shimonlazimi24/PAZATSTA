/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  // Do NOT add assetPrefix - it breaks @netlify/plugin-nextjs static asset serving
};

module.exports = nextConfig;
