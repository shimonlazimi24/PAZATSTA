/**
 * "The lesson did not take place" — taking a lesson out of the hours after the fact.
 *
 * Before this, a lesson that had already passed could not be canceled: the cancel
 * button only exists for future lessons, and the only action offered on a past one
 * was "fill report". A teacher who filled it marked the lesson completed, and from
 * then on it was counted in the monthly hours summary with no way back.
 *
 * - teacher or admin: a lesson that has started and has no report yet → canceled.
 * - admin only: a lesson already marked completed → canceled. The report is kept
 *   for the record; only the status changes, which removes it from the hours.
 */

export type NotHeldDecision =
  | { ok: true; from: "scheduled" | "completed" }
  | { ok: false; status: number; message: string };

export function decideNotHeld(params: {
  status: string;
  lessonStarted: boolean;
  isAdmin: boolean;
}): NotHeldDecision {
  const { status, lessonStarted, isAdmin } = params;
  if (status === "scheduled") {
    if (!lessonStarted) {
      return { ok: false, status: 400, message: "השיעור עוד לא התחיל. לביטול שיעור עתידי השתמשו ב\"בטל שיעור\"" };
    }
    return { ok: true, from: "scheduled" };
  }
  if (status === "completed") {
    if (!isAdmin) {
      return { ok: false, status: 403, message: "כבר נשלח דוח על השיעור. רק מנהל יכול להוציא אותו מהשעות" };
    }
    return { ok: true, from: "completed" };
  }
  if (status === "canceled") {
    return { ok: false, status: 409, message: "השיעור כבר מסומן כמבוטל" };
  }
  return { ok: false, status: 400, message: "אפשר לסמן רק שיעור שאושר" };
}
