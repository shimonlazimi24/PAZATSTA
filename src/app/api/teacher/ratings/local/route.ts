import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { fileProblem, kindOfType, ratingMode } from "@/lib/ratings";
import { LOCAL_RATINGS_DIR, toItem } from "@/lib/ratings-server";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
};

/** Development machines only: keeps the file on disk, since there is no file storage to send it to. */
export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ratingMode() !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = (await req.formData()).get("file") as File | null;
  if (!file?.size) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  const kind = kindOfType(file.type);
  const problem = fileProblem(file.type, file.size);
  if (!kind || problem) return NextResponse.json({ error: problem ?? "סוג קובץ לא נתמך" }, { status: 400 });
  const dir = path.join(LOCAL_RATINGS_DIR, user.id);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(8).toString("hex")}${EXT[file.type]}`;
  await writeFile(path.join(dir, name), new Uint8Array(await file.arrayBuffer()));
  const row = await prisma.ratingUpload.create({
    data: { teacherId: user.id, kind, url: `/uploads/ratings/${user.id}/${name}`, size: file.size },
  });
  return NextResponse.json(toItem(row));
}
