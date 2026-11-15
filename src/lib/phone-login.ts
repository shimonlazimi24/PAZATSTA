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
  if (rows.length === 0) return role === "student" || role === "auto" ? findStudentByParentPhone(normalized) : { kind: "none" };
  if (rows.length === 1) return { kind: "found", email: rows[0].email };
  // On the shared screen, a staff account wins over student accounts with the same number.
  if (role === "auto") {
    const staff = rows.filter((r) => r.role !== "student");
    if (staff.length === 1) return { kind: "found", email: staff[0].email };
  }
  return { kind: "several" };
}

/** The same normalisation as SQL_NORMALIZED_PHONE, applied to a student's saved parent phone. */
const SQL_NORMALIZED_PARENT_PHONE = SQL_NORMALIZED_PHONE.replaceAll("regexp_replace(phone,", `regexp_replace(sp."parentPhone",`);

/**
 * No account has this number as its own. Many students booked with a parent's
 * phone, so a number saved as the parent phone of exactly one student opens that
 * student's account. Siblings sharing a parent's phone cannot be told apart, so
 * they log in by email instead.
 */
async function findStudentByParentPhone(normalized: string): Promise<PhoneAccount> {
  const rows = await prisma.$queryRaw<{ email: string }[]>`
    SELECT u.email FROM "StudentProfile" sp
    JOIN "User" u ON u.id = sp."userId"
    WHERE u.role = 'student'::"Role"
      AND sp."parentPhone" IS NOT NULL
      AND ${Prisma.raw(SQL_NORMALIZED_PARENT_PHONE)} = ${normalized}
    LIMIT 2`;
  if (rows.length === 0) return { kind: "none" };
  if (rows.length === 1) return { kind: "found", email: rows[0].email };
  return { kind: "several" };
}
