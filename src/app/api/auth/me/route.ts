import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { getTeacherPermissions } from "@/lib/teacher-permissions";

const SESSION_COOKIE = "session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const hasCookie = !!cookieStore.get(SESSION_COOKIE)?.value;
    const user = await getUserFromSession();
    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.log("[auth/me] No session:", hasCookie ? "cookie present but invalid/expired" : "no cookie");
      }
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({
      role: user.role,
      email: user.email,
      canAccessAdmin: canAccessAdmin(user),
      // What a teacher takes part in, so the menu shows only their areas.
      ...(user.role === "teacher" ? { teaching: await getTeacherPermissions(user.id) } : {}),
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.log("[auth/me] Error:", e instanceof Error ? e.message : "unknown");
    }
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
