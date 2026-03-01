import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * DELETE: Remove a teacher from the system (admin only).
 * Cascades: TeacherProfile, Availability, Lessons (as teacher), Sessions.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
    });
    if (!teacher) {
      return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
    }
    await prisma.user.delete({
      where: { id: teacherId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/teachers] DELETE error:", e);
    return NextResponse.json(
      { error: "שגיאה במחיקת המורה" },
      { status: 500 }
    );
  }
}
