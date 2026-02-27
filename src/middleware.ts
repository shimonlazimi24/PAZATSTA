import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session";
const PUBLIC_PATHS = ["/", "/login", "/verify", "/welcome"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/cron", "/login/", "/p/lesson-summary/"];

const STUDENT_PREFIX = "/student";
const TEACHER_PREFIX = "/teacher";
const ADMIN_PREFIX = "/admin";

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/welcome") {
    const res = NextResponse.redirect(new URL("/book", req.url));
    setNoStore(res);
    return res;
  }

  const res = isPublic(path)
    ? NextResponse.next()
    : req.cookies.get(SESSION_COOKIE)?.value
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", req.url));

  // Prevent Netlify/CDN from caching HTML. Cached HTML has old /_next/static/* hashes
  // → 404 after redeploy → ChunkLoadError + wrong MIME type on all pages.
  setNoStore(res);
  return res;
}

function setNoStore(res: NextResponse): void {
  res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Netlify-CDN-Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
