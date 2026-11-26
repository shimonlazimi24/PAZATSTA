import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { deleteRating } from "@/lib/ratings-server";

export const dynamic = "force-dynamic";

/** A teacher removes their own upload; an admin may remove any. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const row = await prisma.ratingUpload.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (row.teacherId !== user.id && !canAccessAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await deleteRating(row);
  return NextResponse.json({ ok: true });
}
