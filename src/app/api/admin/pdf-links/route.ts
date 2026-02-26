import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { createLessonSummaryLink } from "@/lib/publicPdfLink";

export const runtime = "nodejs";

async function requireAdmin() {
  const user = await getUserFromSession();
  if (!user) return { ok: false as const, status: 401, error: "נדרשת התחברות" };
  const allowed = user.role === "admin" || canAccessAdmin({ role: user.role, email: user.email });
  if (!allowed) return { ok: false as const, status: 403, error: "אין הרשאה" };
  return { ok: true as const, user };
}

/** GET ?lessonId=xxx - list links for a lesson */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const links = await prisma.publicPdfLink.findMany({
    where: { lessonId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      lessonId: true,
      recipientEmail: true,
      isRevoked: true,
      createdAt: true,
      lastAccessedAt: true,
      accessCount: true,
    },
  });

  return NextResponse.json({ links });
}

/** POST - revoke or regenerate */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { action: string; linkId?: string; lessonId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "revoke") {
    const linkId = typeof body.linkId === "string" ? body.linkId : "";
    if (!linkId) return NextResponse.json({ error: "linkId required" }, { status: 400 });

    await prisma.publicPdfLink.update({
      where: { id: linkId },
      data: { isRevoked: true },
    });
    return NextResponse.json({ ok: true, message: "הקישור בוטל" });
  }

  if (action === "regenerate") {
    const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

    await prisma.publicPdfLink.updateMany({
      where: { lessonId },
      data: { isRevoked: true },
    });

    const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    if (!baseUrl) {
      return NextResponse.json({ error: "APP_URL not configured" }, { status: 500 });
    }

    const { publicUrl } = await createLessonSummaryLink({
      lessonId,
      baseUrl,
    });

    return NextResponse.json({ ok: true, publicUrl, message: "נוצר קישור חדש" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
