import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/**
 * Moves everything of one student account into another and deletes the first:
 * a student who signed up with a phone and later with an email ends up with one
 * account. Lessons, the student profile and the phone move; sessions of the old
 * account are dropped. Runs in one transaction, so it all happens or none of it.
 */
export async function mergeStudentAccounts(fromId: string, intoId: string): Promise<void> {
  if (fromId === intoId) return;
  await prisma.$transaction(async (tx) => {
    const [from, into] = await Promise.all([
      tx.user.findUnique({ where: { id: fromId }, include: { studentProfile: true } }),
      tx.user.findUnique({ where: { id: intoId }, include: { studentProfile: true } }),
    ]);
    if (!from || !into) throw new Error("account not found");
    if (from.role !== "student" || into.role !== "student") throw new Error("only student accounts can be merged");

    await moveLessons(tx, fromId, intoId);
    await mergeProfiles(tx, from.studentProfile, into.studentProfile, intoId);

    await tx.session.deleteMany({ where: { userId: fromId } });
    await tx.user.delete({ where: { id: fromId } });
    await tx.user.update({
      where: { id: intoId },
      data: {
        ...(into.phone ? {} : from.phone ? { phone: from.phone } : {}),
        ...(into.name ? {} : from.name ? { name: from.name } : {}),
      },
    });
  });
}

async function moveLessons(tx: Tx, fromId: string, intoId: string) {
  // A student holds one live seat per workshop. If both accounts signed up for
  // the same workshop, the duplicate seat of the old account is released first.
  const intoWorkshops = await tx.lesson.findMany({
    where: { studentId: intoId, workshopId: { not: null }, status: { not: "canceled" } },
    select: { workshopId: true },
  });
  const taken = intoWorkshops.map((l) => l.workshopId!).filter(Boolean);
  if (taken.length) {
    await tx.lesson.updateMany({
      where: { studentId: fromId, workshopId: { in: taken }, status: { not: "canceled" } },
      data: { status: "canceled", canceledAt: new Date() },
    });
  }
  await tx.lesson.updateMany({ where: { studentId: fromId }, data: { studentId: intoId } });
}

type Profile = {
  id: string;
  studentFullName: string | null;
  parentFullName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  currentScreeningType: string | null;
  currentScreeningDate: Date | null;
} | null;

async function mergeProfiles(tx: Tx, from: Profile, into: Profile, intoId: string) {
  if (!from) return;
  if (!into) {
    await tx.studentProfile.update({ where: { id: from.id }, data: { userId: intoId } });
    return;
  }
  // Keep what the account being kept already has; fill only its empty fields.
  await tx.studentProfile.update({
    where: { id: into.id },
    data: {
      studentFullName: into.studentFullName ?? from.studentFullName,
      parentFullName: into.parentFullName ?? from.parentFullName,
      parentPhone: into.parentPhone ?? from.parentPhone,
      parentEmail: into.parentEmail ?? from.parentEmail,
      currentScreeningType: into.currentScreeningType ?? from.currentScreeningType,
      currentScreeningDate: into.currentScreeningDate ?? from.currentScreeningDate,
    },
  });
  await tx.studentProfile.delete({ where: { id: from.id } });
}
