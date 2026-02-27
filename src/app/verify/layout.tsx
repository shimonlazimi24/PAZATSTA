/** Force dynamic rendering so Netlify never serves cached HTML with stale asset hashes.
 * Without this, /verify can serve cached HTML referencing old /_next/static/* URLs that 404,
 * causing ChunkLoadError and MIME type errors (text/html instead of text/css). */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
