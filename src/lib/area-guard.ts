import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { safeNext, type Area } from "@/lib/login-next";

/**
 * Lets the signed-in user into one area of the app, or sends them where they can
 * act: to login (keeping the page they wanted) when signed out, or to a page that
 * explains they are on another account, instead of silently landing on their own
 * home screen.
 */
export async function requireArea(area: Area) {
  const path = safeNext((await headers()).get("x-pathname"));
  let user;
  try {
    user = await getUserFromSession();
  } catch (e) {
    console.error(`[${area}/layout] getUserFromSession failed:`, e);
    user = null;
  }
  if (!user) redirect(path ? `/login?${new URLSearchParams({ next: path })}` : "/login");
  const allowed = area === "admin" ? canAccessAdmin(user) : user.role === area;
  if (!allowed) redirect(`/switch-account?${new URLSearchParams({ need: area, ...(path ? { next: path } : {}) })}`);
  return user;
}
