import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Delete a workshop when there are no non-canceled lessons, unless `?force=1`:
 * admin-only — cancels all workshop lessons (pending, scheduled, completed) then deletes.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: id.trim() },
      include: { teacher: { include: { teacherProfile: true } } },
    });
    if (!workshop) {
      return NextResponse.json({ error: "הסדנה לא נמצאה" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const force =
      searchParams.get("force") === "1" || searchParams.get("force") === "true";

    const activeCount = await prisma.lesson.count({
      where: {
        workshopId: workshop.id,
        status: { not: "canceled" },
      },
    });
    if (activeCount > 0 && !force) {
      return NextResponse.json(
        {
          error:
            "לא ניתן למחוק: יש הרשמות פעילות לסדנה (ממתינות לאישור, מתוזמנות או הושלמו). בטלו או טפלו בהן לפני המחיקה, או אשרו מחיקה עם ביטול כל ההרשמות מהממשק.",
        },
        { status: 409 }
      );
    }

    const topicLabel = workshop.topicLabel;
    const specialties = workshop.teacher.teacherProfile?.specialties ?? [];

    await prisma.$transaction(async (tx) => {
      if (specialties.includes(topicLabel)) {
        await tx.teacherProfile.update({
          where: { userId: workshop.teacherId },
          data: {
            specialties: specialties.filter((s) => s !== topicLabel),
          },
        });
      }
      /**
       * Must delete lesson rows before deleting the workshop. `ON DELETE SET NULL` on
       * `Lesson.workshopId` would set null on every registration at once; several students
       * share the same (teacherId, date, startTime), and the partial unique index
       * `Lesson_teacher_date_start_when_no_workshop` only allows one row per slot when
       * workshopId IS NULL — so SET NULL would violate the constraint (500).
       */
      await tx.lesson.deleteMany({ where: { workshopId: workshop.id } });
      await tx.workshop.delete({ where: { id: workshop.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/workshops DELETE]", e);
    return NextResponse.json({ error: "שגיאה במחיקת הסדנה" }, { status: 500 });
  }
}
