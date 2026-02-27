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
    return NextResponse.redirect(new URL("/book", req.url));
  }
  if (isPublic(path)) {
    const res = NextResponse.next();
    // Prevent Netlify Edge from caching /verify HTML (stale HTML = wrong asset hashes = 404)
    if (path === "/verify") {
      res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
      res.headers.set("Pragma", "no-cache");
    }
    return res;
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
