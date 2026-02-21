/**
 * Teacher with this email can access /admin (same as role "admin").
 * Change this to the teacher email you want to grant admin access.
 */
export const ADMIN_TEACHER_EMAIL = "teacher@test.com";

export function canAccessAdmin(user: { role: string; email: string }): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && user.email === ADMIN_TEACHER_EMAIL) return true;
  return false;
}
