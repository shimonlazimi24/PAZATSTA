/**
 * Teacher emails that can access /admin (comma-separated in env).
 * Falls back to teacher@test.com in development.
 */
const ADMIN_EMAILS_RAW = process.env.ADMIN_TEACHER_EMAILS ?? "";
export const ADMIN_TEACHER_EMAILS = ADMIN_EMAILS_RAW
  ? ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : process.env.NODE_ENV === "production"
    ? []
    : ["teacher@test.com"];

/** Extra emails to receive approval notifications (comma-separated). Use when admin isn't in User table. */
const ADMIN_NOTIFY_RAW = process.env.ADMIN_NOTIFICATION_EMAILS ?? "";
export const ADMIN_NOTIFICATION_EMAILS = ADMIN_NOTIFY_RAW
  ? ADMIN_NOTIFY_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : ["shachar.cygler@gmail.com"];

export function canAccessAdmin(user: { role: string; email: string }): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && ADMIN_TEACHER_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}
