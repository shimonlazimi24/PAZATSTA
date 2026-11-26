import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Topics the admin added, for the booking form and the specialty pickers.
 * Public, like the teacher list. With ?categories=1 the cards the admin added
 * come along: { topics, categories }.
 */
export async function GET(req: Request) {
  try {
    const [rows, cats] = await Promise.all([
      prisma.bookingTopic.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, category: true, label: true },
      }),
      prisma.bookingCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, active: true } }),
    ]);
    // Topics of a hidden card are hidden with it.
    const hidden = new Set(cats.filter((c) => !c.active).map((c) => c.id));
    const topics = rows.filter((r) => !hidden.has(r.category));
    if (new URL(req.url).searchParams.get("categories")) {
      const categories = cats.filter((c) => c.active).map(({ id, title }) => ({ id, title }));
      return NextResponse.json({ topics, categories }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(topics, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // A deploy ahead of its migration must not break booking: just no added topics.
    console.error("[topics GET]", e);
    return NextResponse.json(new URL(req.url).searchParams.get("categories") ? { topics: [], categories: [] } : []);
  }
}
