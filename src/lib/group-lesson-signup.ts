import type { Prisma } from "@prisma/client";

/**
 * Loads a group lesson inside a transaction with its row locked, so two teachers
 * taking the last place at the same moment cannot both get it: the second waits
 * for the first to commit, then sees the lesson full.
 */
export async function lockGroupLessonForSignup(tx: Prisma.TransactionClient, id: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "GroupLesson" WHERE "id" = ${id} FOR UPDATE`;
  if (locked.length === 0) return null;
  return tx.groupLesson.findUnique({
    where: { id },
    include: { type: true, signups: { select: { teacherId: true } } },
  });
}
