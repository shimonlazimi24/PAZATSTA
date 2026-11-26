import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { MAX_UPLOADS_PER_TEACHER, MAX_VIDEO_BYTES, RATING_TYPES, ratingFolder, ratingMode } from "@/lib/ratings";

export const dynamic = "force-dynamic";

/** Hands the teacher's browser a short-lived permit to upload one file into their own folder. */
export async function POST(request: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ratingMode() !== "blob") return NextResponse.json({ error: "ההעלאה לא פעילה" }, { status: 503 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(ratingFolder(user.id))) throw new Error("Forbidden");
        if ((await prisma.ratingUpload.count({ where: { teacherId: user.id } })) >= MAX_UPLOADS_PER_TEACHER) {
          throw new Error("הגעתם למספר ההעלאות המרבי. מחקו קבצים ישנים.");
        }
        return { allowedContentTypes: RATING_TYPES, maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
