import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SQL_NORMALIZED_PHONE } from "@/lib/phone";

export type LoginRole = "student" | "teacher" | "admin";

export type PhoneAccount =
  | { kind: "found"; email: string }
  | { kind: "none" }
  | { kind: "several" };

/**
 * Finds the one account with this mobile number and role. A number saved on
 * more than one account of that role cannot be used to log in: it would be a
 * guess which account to open.
 */
export async function findAccountByPhone(normalized: string, role: LoginRole): Promise<PhoneAccount> {
  const rows = await prisma.$queryRaw<{ email: string }[]>`
    SELECT email FROM "User"
    WHERE phone IS NOT NULL
      AND role = ${role}::"Role"
      AND ${Prisma.raw(SQL_NORMALIZED_PHONE)} = ${normalized}
    LIMIT 2`;
  if (rows.length === 0) return { kind: "none" };
  if (rows.length > 1) return { kind: "several" };
  return { kind: "found", email: rows[0].email };
}
