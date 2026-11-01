/**
 * Where to go after login. Links in emails point straight at a page (a teacher's
 * group lessons, a frontal day); when the reader still has to log in, the page
 * travels along as ?next= and they land on it afterwards, not on a home screen.
 */

export type Area = "teacher" | "student" | "admin";

const AREA_PREFIXES: [string, Area][] = [
  ["/teacher", "teacher"],
  ["/student", "student"],
  ["/book", "student"],
  ["/admin", "admin"],
];

/** A path inside the app, or "" — never another site ("//evil.com", "https://…"). */
export function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\") || s.length > 300) return "";
  return areaOf(s) ? s : "";
}

/** Which part of the app a path belongs to. */
export function areaOf(path: string): Area | null {
  const pathname = path.split(/[?#]/)[0];
  for (const [prefix, area] of AREA_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return area;
  }
  return null;
}

/** The page to open after login, when this user may open it; otherwise null. */
export function nextFor(user: { role: string; canAccessAdmin: boolean }, raw: unknown): string | null {
  const next = safeNext(raw);
  if (!next) return null;
  const area = areaOf(next);
  if (area === "admin") return user.canAccessAdmin ? next : null;
  return area === user.role ? next : null;
}

export const AREA_LABEL: Record<Area, { who: string; as: string; home: string }> = {
  teacher: { who: "למורים", as: "מורה", home: "/teacher/dashboard" },
  student: { who: "לתלמידים", as: "תלמיד", home: "/student" },
  admin: { who: "למנהלים", as: "מנהל", home: "/admin" },
};

/** Login page for an area, carrying the destination along. */
export function loginPathFor(area: Area, next: string): string {
  const base = `/login/${area}`;
  return next ? `${base}?${new URLSearchParams({ next })}` : base;
}
