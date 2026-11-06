import { prisma } from "@/lib/db";
import { nextFor } from "@/lib/login-next";
import { canAccessAdmin } from "@/lib/admin";
import { createSession } from "@/lib/auth";
import { displayIsraeliMobile, normalizeIsraeliMobile } from "@/lib/phone";

export type LoginRole = "student" | "teacher" | "admin";

export type LoginOutcome =
  | { ok: true; sessionId: string; role: string; redirect: string }
  | { ok: false; status: 403; error: string };

/**
 * What happens once a person has proved they own an email address, whether by
 * a one-time code or by Google: the role checks, creating a new student, and the
 * session. Both ways of logging in share it so they can never disagree.
 *
 * `consume` runs once the checks pass, e.g. to delete the used one-time code.
 */
export async function completeLogin(params: {
  email: string;
  /** "auto": the shared login screen; the account's own role decides (a new email is a new student). */
  role: LoginRole | "auto";
  phone?: string;
  next?: string;
  consume?: () => Promise<void>;
}): Promise<LoginOutcome> {
  const { email, next } = params;
  // The phone is a login key now, so only a real Israeli mobile number is kept.
  const phone = params.phone && normalizeIsraeliMobile(params.phone) ? displayIsraeliMobile(normalizeIsraeliMobile(params.phone)!) : "";
  let user = await prisma.user.findUnique({ where: { email } });
  const role: LoginRole =
    params.role !== "auto" ? params.role : user?.role === "teacher" || user?.role === "admin" ? user.role : "student";

  if (role === "teacher" || role === "admin") {
    if (!user || user.role !== role) {
      return {
        ok: false,
        status: 403,
        error:
          role === "teacher"
            ? "חשבון מורה לא קיים עבור אימייל זה. נא לפנות לאדמין להגדרת מורה."
            : "לכתובת הזו אין הרשאת ניהול. ודאו שזו הכתובת הנכונה",
      };
    }
    await params.consume?.();
  } else {
    if (user && user.role === "teacher") {
      return {
        ok: false,
        status: 403,
        error: "חשבון זה רשום כמורה. נא להתחבר דרך \"התחבר כמורה\" או להשתמש באימייל אחר לכניסה כתלמיד.",
      };
    }
    if (!user) {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, role: "student", ...(phone ? { phone } : {}) },
        });
        try {
          await tx.studentProfile.upsert({ where: { userId: created.id }, create: { userId: created.id }, update: {} });
        } catch (profileErr) {
          console.error("[login] StudentProfile upsert failed (run migrations?):", profileErr);
        }
        return created;
      });
      await params.consume?.();
    } else {
      if (phone) await prisma.user.update({ where: { id: user.id }, data: { phone } });
      await params.consume?.();
    }
  }

  const sessionId = await createSession(user.id);
  // The page the user was heading for (an email link, say), when they may open it.
  const target = nextFor({ role: user.role, canAccessAdmin: canAccessAdmin(user) }, next);
  const redirect = target
    ? target
    : user.role === "student"
      ? "/book"
      : user.role === "teacher"
        ? "/teacher/dashboard"
        : user.role === "admin"
          ? "/admin"
          : "/";
  return { ok: true, sessionId, role: user.role, redirect };
}
