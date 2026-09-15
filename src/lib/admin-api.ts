import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

/**
 * Shared guards for admin API routes.
 *
 * These live here rather than in a route file because Next validates that a
 * route module exports only its handlers — exporting a helper from one and
 * importing it into another fails the generated route types.
 */

export async function requireAdmin(): Promise<{ error: NextResponse } | { ok: true }> {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

/** A deploy that lands before its migration should say so, not 500. */
export function missingTableResponse(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return NextResponse.json(
      { error: "הטבלה לא קיימת עדיין. הריצו: npx prisma migrate deploy" },
      { status: 503 }
    );
  }
  return null;
}
