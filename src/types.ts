export type Role = "admin" | "teacher" | "parent" | "student";
export const ROLES: Role[] = ["admin", "teacher", "parent", "student"];

/** Base lesson shape for display (API responses, lists). Extend as needed. */
export type DisplayLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  topic?: string | null;
  questionFromStudent?: string | null;
  followUpCompletedAt?: string | null;
  teacher?: { id?: string; name: string | null; email: string };
  student?: {
    id?: string;
    name: string | null;
    email: string;
    phone?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
    parentEmail?: string | null;
    screeningDate?: string | null;
    screeningType?: string | null;
  };
  summary?: { pdfUrl: string | null } | null;
};

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
