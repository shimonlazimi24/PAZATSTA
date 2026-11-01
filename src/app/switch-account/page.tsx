import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { AREA_LABEL, loginPathFor, nextFor, safeNext, type Area } from "@/lib/login-next";
import { SwitchAccountButton } from "./SwitchAccountButton";

export const dynamic = "force-dynamic";

const AREAS: Area[] = ["teacher", "student", "admin"];

/**
 * Someone opened a page meant for another kind of account (an admin clicking a
 * teacher's email link, say). Say so, and offer to log in as the right one.
 */
export default async function SwitchAccountPage({ searchParams }: { searchParams: Promise<{ need?: string; next?: string }> }) {
  const params = await searchParams;
  const need = AREAS.find((a) => a === params.need) ?? "teacher";
  const next = safeNext(params.next);
  const user = await getUserFromSession().catch(() => null);
  if (!user) redirect(loginPathFor(need, next));
  // Already allowed (logged in as the right account in another tab): just go.
  const target = nextFor({ role: user.role, canAccessAdmin: canAccessAdmin(user) }, next);
  if (target) redirect(target);

  const current = (AREAS.find((a) => a === user.role) ?? "student") as Area;
  const wanted = AREA_LABEL[need];
  return (
    <main dir="rtl" className="flex min-h-dvh items-center justify-center bg-[#F6F6F6] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-9 w-auto object-contain" width={120} height={40} />
        </div>
        <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">הקישור הזה מיועד {wanted.who}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            כרגע אתם מחוברים כ{AREA_LABEL[current].as}
            <span className="block break-all font-medium text-[var(--color-text)]" dir="ltr">{user.email}</span>
          </p>
          <SwitchAccountButton to={loginPathFor(need, next)} label={`התנתקות וכניסה כ${wanted.as}`} />
          <Link href={AREA_LABEL[current].home} className="block text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline">
            להמשיך לאזור שלי
          </Link>
        </div>
      </div>
    </main>
  );
}
