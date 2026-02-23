import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { getUserFromSession } from "@/lib/auth";
import {
  safeUploadTypeCheck,
  ALLOWED_UPLOAD_MIMES,
  ALLOWED_UPLOAD_EXTENSIONS,
} from "@/lib/upload-utils";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB

// Public storage: files under public/uploads are served by Next.js/static server.
// For private storage, serve via API (e.g. api/uploads/[...path]) with auth.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "teachers");

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
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "גודל הקובץ מקסימלי 3MB" },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const typeCheck = safeUploadTypeCheck(bytes);
    if (!typeCheck.ok) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP" },
        { status: 400 }
      );
    }
    if (!ALLOWED_UPLOAD_MIMES.includes(typeCheck.mime)) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP" },
        { status: 400 }
      );
    }
    const ext = ALLOWED_UPLOAD_EXTENSIONS.includes(typeCheck.ext.toLowerCase())
      ? typeCheck.ext.toLowerCase()
      : ".jpg";

    await mkdir(UPLOAD_DIR, { recursive: true });

    // Remove any existing image for this user (different extension) to avoid leftover files.
    for (const e of ALLOWED_UPLOAD_EXTENSIONS) {
      const existingPath = path.join(UPLOAD_DIR, `${user.id}${e}`);
      try {
        await unlink(existingPath);
      } catch {
        // ignore if not found
      }
    }

    const filename = `${user.id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await writeFile(filepath, bytes);

    // Cache-bust so browsers don't serve old image after re-upload.
    const url = `/uploads/teachers/${filename}?v=${Date.now()}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[teacher/profile/upload] error:", e);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}
