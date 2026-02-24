# Netlify Deployment Notes

## Why API routes returned 503

With `publish = ".next"` and no Next.js runtime plugin, Netlify treated the site as **static**. It served files from `.next` but did not deploy API routes as Netlify Functions. Requests to `/api/*` had no handler and returned 503.

## Fix

- **@netlify/plugin-nextjs** transforms the Next.js build so that:
  - API routes (Route Handlers) are deployed as Netlify Functions
  - Middleware runs as Edge Functions
  - SSR/ISR pages are handled by serverless functions
  - Image optimization uses Netlify Image CDN

- **Removed `publish`** – the plugin manages the output directory and function deployment.

- **NODE_VERSION = "20"** – ensures Node 18+ required by the plugin.

## Redirects

Do **not** add custom redirects for `/_next/image` or `/_ipx/*` – the plugin handles image optimization. Custom redirects can conflict with the plugin.
