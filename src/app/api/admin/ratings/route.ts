import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { missingTableResponse, requireAdmin } from "@/lib/admin-api";
import { ratingMode } from "@/lib/ratings";
import { toItem } from "@/lib/ratings-server";

export const dynamic = "force-dynamic";

/** Every teacher with their uploads and counts: photos, videos, and lessons they completed. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const [teachers, uploads, done] = await Promise.all([
      prisma.user.findMany({
        where: { role: "teacher" },
        select: { id: true, name: true, email: true, teacherProfile: { select: { displayName: true } } },
      }),
      prisma.ratingUpload.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.lesson.groupBy({ by: ["teacherId"], where: { status: "completed" }, _count: { _all: true } }),
    ]);
    const doneBy = new Map(done.map((d) => [d.teacherId, d._count._all]));
    const rows = teachers
      .map((t) => {
        const items = uploads.filter((u) => u.teacherId === t.id);
        return {
          id: t.id,
          name: t.teacherProfile?.displayName || t.name || t.email,
          images: items.filter((i) => i.kind === "image").length,
          videos: items.filter((i) => i.kind === "video").length,
          lessonsDone: doneBy.get(t.id) ?? 0,
          items: items.map(toItem),
        };
      })
      .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "he"));
    return NextResponse.json({ mode: ratingMode(), teachers: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return missingTableResponse(e) ?? NextResponse.json({ error: "שגיאה בטעינה" }, { status: 500 });
  }
}
