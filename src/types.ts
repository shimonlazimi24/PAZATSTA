export type Role = "admin" | "teacher" | "parent" | "student";
export const ROLES: Role[] = ["admin", "teacher", "parent", "student"];

/** Canonical lesson statuses (mirrors Prisma LessonStatus). */
export type LessonStatus =
  | "pending_approval"  // PENDING_APPROVAL
  | "scheduled"         // APPROVED
  | "completed"        // COMPLETED
  | "canceled";        // CANCELLED (also used for declined)

/** Approved = teacher/admin approved; report allowed only when approved. */
export const APPROVED_LESSON_STATUS: LessonStatus = "scheduled";

/** Report status derived from lesson.reportCompleted + lesson.summary. */
export type ReportStatus = "none" | "draft" | "submitted";
