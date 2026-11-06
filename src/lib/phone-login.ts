import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SQL_NORMALIZED_PHONE } from "@/lib/phone";

export type LoginRole = "student" | "teacher" | "admin";
/** "auto": one login screen for everyone; the account found decides where it leads. */
export type LoginRoleOrAuto = LoginRole | "auto";

export type PhoneAccount =
  | { kind: "found"; email: string }
  | { kind: "none" }
  | { kind: "several" };

/**
 * Finds the one account with this mobile number and role. A number saved on
 * more than one account of that role cannot be used to log in: it would be a
 * guess which account to open.
 */
export async function findAccountByPhone(normalized: string, role: LoginRoleOrAuto): Promise<PhoneAccount> {
  const rows = await prisma.$queryRaw<{ email: string; role: string }[]>`
    SELECT email, role::text AS role FROM "User"
    WHERE phone IS NOT NULL
      ${role === "auto" ? Prisma.empty : Prisma.sql`AND role = ${role}::"Role"`}
      AND ${Prisma.raw(SQL_NORMALIZED_PHONE)} = ${normalized}
    LIMIT 5`;
  if (rows.length === 0) return { kind: "none" };
  if (rows.length === 1) return { kind: "found", email: rows[0].email };
  // On the shared screen, a staff account wins over student accounts with the same number.
  if (role === "auto") {
    const staff = rows.filter((r) => r.role !== "student");
    if (staff.length === 1) return { kind: "found", email: staff[0].email };
  }
  return { kind: "several" };
}
