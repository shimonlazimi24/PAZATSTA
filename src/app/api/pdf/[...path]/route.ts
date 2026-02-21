import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filename = pathSegments.join("/");
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const fullPath = path.join(STORAGE_DIR, filename);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${path.basename(filename)}"`,
    },
  });
}
