import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getUserFromSession } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "גודל הקובץ מקסימלי 3MB" },
        { status: 400 }
      );
    }
    const ext = path.extname(file.name) || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : ".jpg";
    const dir = path.join(process.cwd(), "public", "uploads", "teachers");
    await mkdir(dir, { recursive: true });
    const filename = `${user.id}${safeExt}`;
    const filepath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, new Uint8Array(bytes));
    const url = `/uploads/teachers/${filename}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[teacher/profile/upload] error:", e);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}
