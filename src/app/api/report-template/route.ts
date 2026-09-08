import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { getReportFields, getTipsForLesson } from "@/lib/report-template";

export const dynamic = "force-dynamic";

/**
 * The template for one lesson's summary form: the six fields with their current
 * wording, and the tips offered for that lesson's type.
 *
 * Takes a lesson id rather than a topic string. The rule for which topic applies
 * — the lesson's own, falling back to the student's screening type — already
 * exists in two places, and handing the matching key to the client would put a
 * third copy there and let the caller choose which tips they are shown.
 */
export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const isAdmin = canAccessAdmin(user);
  if (!isAdmin && user.role !== "teacher") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const lessonId = params.get("lessonId")?.trim();
  if (!lessonId) {
    return NextResponse.json({ error: "חסר מזהה שיעור" }, { status: 400 });
  }
  // When a lesson has no topic the teacher picks the screening type in the form,
  // and the tips have to follow that choice before it is saved. Overriding which
  // tips are offered is the point here, and tips carry no student data.
  const topicOverride = params.get("topic")?.trim();

  const lesson = await prisma.lesson.findFirst({
    where: isAdmin ? { id: lessonId } : { id: lessonId, teacherId: user.id },
    select: {
      topic: true,
      student: { select: { studentProfile: { select: { currentScreeningType: true } } } },
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "שיעור לא נמצא" }, { status: 404 });
  }

  const topic =
    topicOverride || lesson.topic || lesson.student.studentProfile?.currentScreeningType || null;

  const [fields, tips] = await Promise.all([getReportFields(), getTipsForLesson(topic)]);

  return NextResponse.json(
    { topic, fields, tips },
    { headers: { "Cache-Control": "no-store" } }
  );
}
