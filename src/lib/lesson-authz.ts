/**
 * Who may act on a lesson — approve it, reject it, cancel it, move it.
 *
 * The rule lives here because it was written out by hand in each route and drifted:
 * they all tested `isTeacher` where they meant "not an admin". A teacher listed in
 * ADMIN_TEACHER_EMAILS is both, so those checks silently denied admins the very
 * thing their admin grant was for — including, in reject, with the message
 * "only the admin can do this", shown to the admin.
 */

export type LessonActor = {
  /** canAccessAdmin(user) — true for admins and for teachers granted admin access. */
  isAdmin: boolean;
  userId: string;
};

export type LessonForAuthz = {
  teacherId: string;
  workshopId: string | null;
};

export type LessonAuthzResult =
  | { ok: true }
  | { ok: false; reason: "not_owner" | "workshop_admin_only"; message: string };

/**
 * An admin may act on any lesson. A plain teacher may act only on their own, and
 * never on a workshop registration — those are the admin's to manage.
 */
export function canActOnLesson(
  actor: LessonActor,
  lesson: LessonForAuthz
): LessonAuthzResult {
  if (actor.isAdmin) return { ok: true };

  if (lesson.teacherId !== actor.userId) {
    return { ok: false, reason: "not_owner", message: "אין הרשאה" };
  }
  if (lesson.workshopId) {
    return {
      ok: false,
      reason: "workshop_admin_only",
      message: "רישום לסדנה מנוהל על ידי האדמין",
    };
  }
  return { ok: true };
}
