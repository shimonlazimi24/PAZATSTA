/**
 * Teacher emails that can access /admin (comma-separated in env).
 * Falls back to teacher@test.com in development.
 */
const ADMIN_EMAILS_RAW = process.env.ADMIN_TEACHER_EMAILS ?? "";
const ADMIN_TEACHER_EMAILS = ADMIN_EMAILS_RAW
  ? ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : process.env.NODE_ENV === "production"
    ? []
    : ["teacher@test.com"];

export function canAccessAdmin(user: { role: string; email: string }): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && ADMIN_TEACHER_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}
