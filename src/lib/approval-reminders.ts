/**
 * Reminders to a teacher who has not yet approved a lesson request.
 *
 * A request expires (and the lesson is canceled) when its approval window closes,
 * 24 hours after booking. The teacher is told when the request arrives — that is
 * the "24 hours left" message, sent by the booking flow — and reminded again at
 * each mark below, counted in hours left before the window closes.
 *
 * Change the schedule here and only here.
 */
export const REMINDER_MARKS_HOURS_LEFT = [18, 12] as const;

const HOUR_MS = 60 * 60 * 1000;

/**
 * The reminder due now, if any: the most urgent mark already reached that has not
 * been sent. If the job missed a run and two marks are due at once, only the more
 * urgent one is sent — one reminder, not two in a row. Once a mark is sent, no
 * less urgent mark can follow it.
 */
export function dueReminderMark(params: {
  approvalExpiresAt: Date;
  now: Date;
  sentMarks: number[];
}): number | null {
  const hoursLeft = (params.approvalExpiresAt.getTime() - params.now.getTime()) / HOUR_MS;
  if (hoursLeft <= 0) return null;
  const reached = REMINDER_MARKS_HOURS_LEFT.filter((m) => hoursLeft <= m);
  if (reached.length === 0) return null;
  const mostUrgent = Math.min(...reached);
  if (params.sentMarks.some((m) => m <= mostUrgent)) return null;
  return mostUrgent;
}

/** Hours left rounded to the nearest hour, for the message ("נותרו 12 שעות"); never below 1. */
export function hoursLeftLabel(approvalExpiresAt: Date, now: Date): number {
  return Math.max(1, Math.round((approvalExpiresAt.getTime() - now.getTime()) / HOUR_MS));
}

export type ReminderRow = { lessonId: string; teacherId: string; mark: number; sentAt: Date };
export type ReminderLesson = {
  id: string;
  teacherId: string;
  status: string;
  createdAt: Date;
  approvedByTeacherAt: Date | null;
  approvedByAdminAt: Date | null;
  approvalExpiresAt: Date | null;
  /** When the lesson was canceled; null on rows canceled before this was recorded. */
  canceledAt: Date | null;
};

export type TeacherReminderStats = {
  teacherId: string;
  remindersSent: number;
  lessonsReminded: number;
  approvedAfterReminder: number;
  expiredUnapproved: number;
  /** Median hours from request to approval across all requests in the period. */
  medianHoursToApprove: number | null;
};

/**
 * Per-teacher picture for the admin: who needs reminding, whether reminders work,
 * and how long approvals take. `lessons` are the requests created in the period.
 */
export function summarizeReminders(
  reminders: ReminderRow[],
  lessons: ReminderLesson[],
  now: Date
): TeacherReminderStats[] {
  const byTeacher = new Map<string, TeacherReminderStats & { _hours: number[]; _reminded: Set<string> }>();
  const row = (teacherId: string) => {
    let r = byTeacher.get(teacherId);
    if (!r) {
      r = {
        teacherId,
        remindersSent: 0,
        lessonsReminded: 0,
        approvedAfterReminder: 0,
        expiredUnapproved: 0,
        medianHoursToApprove: null,
        _hours: [],
        _reminded: new Set(),
      };
      byTeacher.set(teacherId, r);
    }
    return r;
  };

  const firstReminder = new Map<string, Date>();
  for (const rem of reminders) {
    const r = row(rem.teacherId);
    r.remindersSent++;
    r._reminded.add(rem.lessonId);
    const prev = firstReminder.get(rem.lessonId);
    if (!prev || rem.sentAt < prev) firstReminder.set(rem.lessonId, rem.sentAt);
  }

  for (const l of lessons) {
    const r = row(l.teacherId);
    const approvedAt = l.approvedByTeacherAt ?? l.approvedByAdminAt;
    if (approvedAt) {
      r._hours.push((approvedAt.getTime() - l.createdAt.getTime()) / HOUR_MS);
      const first = firstReminder.get(l.id);
      if (first && approvedAt >= first) r.approvedAfterReminder++;
    } else if (expiredUnapproved(l, now)) {
      r.expiredUnapproved++;
    }
  }

  return Array.from(byTeacher.values())
    .map(({ _hours, _reminded, ...r }) => ({
      ...r,
      lessonsReminded: _reminded.size,
      medianHoursToApprove: median(_hours),
    }))
    .sort((a, b) => b.remindersSent - a.remindersSent || b.expiredUnapproved - a.expiredUnapproved);
}

/**
 * Canceled because the window closed, not because someone rejected or canceled it
 * earlier. Rows from before canceledAt existed fall back to "the window has closed".
 */
function expiredUnapproved(l: ReminderLesson, now: Date): boolean {
  if (l.status !== "canceled" || !l.approvalExpiresAt) return false;
  if (l.canceledAt) return l.canceledAt >= l.approvalExpiresAt;
  return l.approvalExpiresAt <= now;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(m * 10) / 10;
}
