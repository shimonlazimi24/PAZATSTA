/** Force dynamic rendering so /verify is not served from a stale HTML cache with old /_next/static/* hashes. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
