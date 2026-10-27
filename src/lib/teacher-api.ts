import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

/** The signed-in teacher, or a ready 401/403 response. */
export async function requireTeacher(): Promise<
  { error: NextResponse } | { user: { id: string; email: string; name: string | null } }
> {
  const user = await getUserFromSession();
  if (!user) return { error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }) };
  if (user.role !== "teacher") return { error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  return { user: { id: user.id, email: user.email, name: user.name ?? null } };
}
