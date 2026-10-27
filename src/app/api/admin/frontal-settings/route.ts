import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { firstZodMessage } from "@/lib/group-lessons-server";
import { FRONTAL_DEFAULTS_KEY, TemplatesInput, getFrontalDefaults } from "@/lib/frontal-days-server";

export const dynamic = "force-dynamic";

/** Default message, reminder and checklist copied into each new day. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getFrontalDefaults(prisma), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = TemplatesInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  await prisma.appSetting.upsert({
    where: { key: FRONTAL_DEFAULTS_KEY },
    create: { key: FRONTAL_DEFAULTS_KEY, value: parsed.data },
    update: { value: parsed.data },
  });
  return NextResponse.json({ ok: true });
}
