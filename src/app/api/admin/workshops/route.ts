import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { buildWorkshopTopicLabel } from "@/lib/workshop-topic";

export const dynamic = "force-dynamic";

const MAX_WORKSHOP_GENERAL_DESCRIPTION = 4000;

export async function GET() {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const workshops = await prisma.workshop.findMany({
      orderBy: [{ date: "desc" }, { name: "asc" }],
      include: {
        teacher: { select: { name: true, email: true } },
      },
    });
    const ids = workshops.map((w) => w.id);
    const bookedRows =
      ids.length === 0
        ? []
        : await prisma.lesson.groupBy({
            by: ["workshopId"],
            where: {
              workshopId: { in: ids },
              status: { not: "canceled" },
            },
            _count: { _all: true },
          });
    const bookedById = new Map(
      bookedRows.map((r) => [r.workshopId!, r._count._all] as const)
    );

    const list = workshops.map((w) => ({
      id: w.id,
      name: w.name,
      date: w.date.toISOString().slice(0, 10),
      startTime: w.startTime,
      endTime: w.endTime,
      maxParticipants: w.maxParticipants,
      topicLabel: w.topicLabel,
      generalDescription: w.generalDescription ?? null,
      teacherName: w.teacher.name?.trim() || w.teacher.email || "מורה",
      activeBookings: bookedById.get(w.id) ?? 0,
    }));

    return NextResponse.json(list, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[admin/workshops GET]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "טבלת הסדנאות עדיין לא קיימת במסד הנתונים. הריצו: npx prisma migrate deploy.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "שגיאה בטעינת הסדנאות" }, { status: 500 });
  }
}

/** Single parse for HH:MM validation; returns normalized + minutes since midnight. */
function parseHHMM(hhmm: string): { normalized: string; minutes: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return {
    normalized: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
    minutes: h * 60 + min,
  };
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const generalDescriptionRaw =
      typeof body.generalDescription === "string" ? body.generalDescription.trim() : "";
    const generalDescription =
      generalDescriptionRaw.length > 0
        ? generalDescriptionRaw.slice(0, MAX_WORKSHOP_GENERAL_DESCRIPTION)
        : null;
    const dateStr = typeof body.date === "string" ? body.date.trim() : "";
    const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
    const maxParticipants =
      typeof body.maxParticipants === "number" && body.maxParticipants > 0
        ? Math.floor(body.maxParticipants)
        : typeof body.maxParticipants === "string"
          ? parseInt(body.maxParticipants, 10)
          : 0;
    const startRaw =
      typeof body.startTime === "string" && body.startTime.trim()
        ? body.startTime.trim()
        : "09:00";
    const endRaw =
      typeof body.endTime === "string" && body.endTime.trim() ? body.endTime.trim() : "17:00";
    const startParsed = parseHHMM(startRaw);
    const endParsed = parseHHMM(endRaw);
    if (!startParsed || !endParsed) {
      return NextResponse.json(
        { error: "שעות לא תקינות (נדרש פורמט HH:MM)" },
        { status: 400 }
      );
    }
    const startTime = startParsed.normalized;
    const endTime = endParsed.normalized;
    const startM = startParsed.minutes;
    const endM = endParsed.minutes;
    if (endM <= startM) {
      return NextResponse.json(
        { error: "שעת הסיום חייבת להיות אחרי שעת ההתחלה" },
        { status: 400 }
      );
    }

    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !teacherId || maxParticipants < 1) {
      return NextResponse.json(
        { error: "נדרשים שם, תאריך (YYYY-MM-DD), מורה ומספר משתתפים חיובי" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
    }

    const topicLabel = buildWorkshopTopicLabel(name, dateStr);

    const existing = await prisma.workshop.findUnique({ where: { topicLabel } });
    if (existing) {
      return NextResponse.json(
        { error: "כבר קיימת סדנה עם אותו שם ותאריך. שנה שם או תאריך." },
        { status: 409 }
      );
    }

    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
      include: { teacherProfile: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
    }

    const workshop = await prisma.$transaction(async (tx) => {
      const w = await tx.workshop.create({
        data: {
          name,
          date,
          teacherId,
          maxParticipants,
          startTime,
          endTime,
          topicLabel,
          generalDescription,
        },
      });

      const specialties = teacher.teacherProfile?.specialties ?? [];
      if (!specialties.includes(topicLabel)) {
        await tx.teacherProfile.upsert({
          where: { userId: teacherId },
          create: {
            userId: teacherId,
            specialties: [topicLabel],
          },
          update: {
            specialties: [...specialties, topicLabel],
          },
        });
      }

      return w;
    });

    return NextResponse.json({
      id: workshop.id,
      topicLabel: workshop.topicLabel,
    });
  } catch (e) {
    console.error("[admin/workshops POST]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "טבלת הסדנאות עדיין לא קיימת במסד הנתונים. הריצו: npx prisma migrate deploy (או migrate dev) ונסו שוב.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "שגיאה ביצירת הסדנה" }, { status: 500 });
  }
}
