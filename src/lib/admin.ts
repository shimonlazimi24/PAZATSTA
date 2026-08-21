import { isValidDeliveryEmail } from "@/lib/validation";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Teacher emails that can access /admin (comma-separated in env).
 * Falls back to teacher@test.com in development.
 *
 * Read at call time: in serverless the environment is not reliably populated when
 * the module is first evaluated.
 */
export function getAdminTeacherEmails(): string[] {
  const parsed = parseEmailList(process.env.ADMIN_TEACHER_EMAILS);
  if (parsed.length > 0) return parsed;
  return process.env.NODE_ENV === "production" ? [] : ["teacher@test.com"];
}

/**
 * Extra addresses that receive approval and lesson-summary mail, for admins who are
 * not User rows. Configured entirely through ADMIN_NOTIFICATION_EMAILS — no
 * hardcoded fallback, so changing who gets notified never needs a deploy.
 */
export function getAdminNotificationEmails(): string[] {
  return parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS).filter(isValidDeliveryEmail);
}

export function canAccessAdmin(user: { role: string; email: string }): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && getAdminTeacherEmails().includes(user.email.toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Every address that should receive admin notifications: admin User rows, teachers
 * granted admin access, and the extra addresses from ADMIN_NOTIFICATION_EMAILS.
 *
 * Both the booking and the lesson-completion flows need exactly this list; keeping
 * one implementation means they cannot drift apart.
 */
export async function resolveAdminRecipients(): Promise<string[]> {
  const { prisma } = await import("@/lib/db");
  const adminTeacherEmails = getAdminTeacherEmails();

  const [adminUsers, adminTeachers] = await Promise.all([
    prisma.user.findMany({ where: { role: "admin" }, select: { email: true } }),
    adminTeacherEmails.length > 0
      ? prisma.user.findMany({
          where: { email: { in: adminTeacherEmails } },
          select: { email: true },
        })
      : Promise.resolve([]),
  ]);

  const recipients = new Set<string>();
  for (const u of [...adminUsers, ...adminTeachers]) {
    if (u.email && isValidDeliveryEmail(u.email)) recipients.add(u.email.toLowerCase());
  }
  for (const e of getAdminNotificationEmails()) recipients.add(e);

  if (recipients.size === 0) {
    console.warn(
      "[admin] No admin notification recipients resolved. Set ADMIN_NOTIFICATION_EMAILS."
    );
  }
  return Array.from(recipients);
}
