import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Topics the admin added, for the booking form and the specialty pickers. Public, like the teacher list. */
export async function GET() {
  try {
    const rows = await prisma.bookingTopic.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, category: true, label: true },
    });
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // A deploy ahead of its migration must not break booking: just no added topics.
    console.error("[topics GET]", e);
    return NextResponse.json([]);
  }
}
