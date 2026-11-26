import { NextResponse } from "next/server";
import { z } from "zod";
import { head } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { missingTableResponse } from "@/lib/admin-api";
import { MAX_UPLOADS_PER_TEACHER, fileProblem, kindOfType, ratingFolder, ratingMode } from "@/lib/ratings";
import { toItem } from "@/lib/ratings-server";

export const dynamic = "force-dynamic";

/** The teacher's own uploads, newest first, and whether uploading is switched on. */
export async function GET() {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await prisma.ratingUpload.findMany({ where: { teacherId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ mode: ratingMode(), folder: ratingFolder(user.id), items: rows.map(toItem) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return missingTableResponse(e) ?? NextResponse.json({ error: "שגיאה בטעינה" }, { status: 500 });
  }
}

const Body = z.object({ url: z.string().url() });

/** Records a file the browser just uploaded to storage. The file is checked in storage, not trusted from the client. */
export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ratingMode() !== "blob") return NextResponse.json({ error: "ההעלאה לא פעילה" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });

  let meta;
  try {
    meta = await head(parsed.data.url);
  } catch {
    return NextResponse.json({ error: "הקובץ לא נמצא. נסו להעלות שוב." }, { status: 400 });
  }
  if (!meta.pathname.startsWith(ratingFolder(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const kind = kindOfType(meta.contentType);
  const problem = fileProblem(meta.contentType, meta.size);
  if (!kind || problem) return NextResponse.json({ error: problem ?? "סוג קובץ לא נתמך" }, { status: 400 });
  if ((await prisma.ratingUpload.count({ where: { teacherId: user.id } })) >= MAX_UPLOADS_PER_TEACHER) {
    return NextResponse.json({ error: "הגעתם למספר ההעלאות המרבי. מחקו קבצים ישנים." }, { status: 400 });
  }
  const row = await prisma.ratingUpload.upsert({
    where: { url: meta.url },
    update: {},
    create: { teacherId: user.id, kind, url: meta.url, size: meta.size },
  });
  return NextResponse.json(toItem(row));
}
