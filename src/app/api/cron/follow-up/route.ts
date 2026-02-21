import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendFollowUpReminder } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const now = new Date();

  const summaries = await prisma.lessonSummary.findMany({
    where: { createdAt: { lt: sevenDaysAgo } },
        include: {
          lesson: {
            include: {
              teacher: true,
              student: {
                include: { studentProfile: true },
              },
            },
          },
        },
  });

  const sentPairs = new Set<string>();
  let sent = 0;
  for (const s of summaries) {
    const studentId = s.lesson.studentId;
    const teacherId = s.lesson.teacherId;
    const pairKey = `${studentId}:${teacherId}`;
    if (sentPairs.has(pairKey)) continue;
    const nextLesson = await prisma.lesson.findFirst({
      where: {
        studentId,
        status: "scheduled",
        date: { gte: now },
      },
    });
    if (nextLesson) continue;
    sentPairs.add(pairKey);

    const teacher = s.lesson.teacher;
    const student = s.lesson.student;
    const parentId = student.studentProfile?.parentId;
    let parentEmail: string | null = null;
    if (parentId) {
      const parent = await prisma.user.findUnique({
        where: { id: parentId },
        select: { email: true },
      });
      parentEmail = parent?.email ?? null;
    }
    const toEmails = [teacher.email];
    if (parentEmail) toEmails.push(parentEmail);

    const lastLessonDate = s.lesson.date.toISOString().slice(0, 10);
    await sendFollowUpReminder({
      to: toEmails,
      studentName: student.name || student.email,
      teacherName: teacher.name || teacher.email,
      lastLessonDate,
    });
    sent += toEmails.length;
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
