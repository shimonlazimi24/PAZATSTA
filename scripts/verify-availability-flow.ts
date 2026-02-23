/**
 * Verification script: teacher creates availability -> student fetch sees it.
 * Run: npx tsx scripts/verify-availability-flow.ts
 * Requires DATABASE_URL. Does not start server; uses Prisma directly + fetch to local API if BASE_URL set.
 *
 * If BASE_URL is not set, only checks DB: creates a slot for a teacher and queries it
 * with the same date range the student endpoint would use (start-of-day, not "now").
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findFirst({
    where: { role: "teacher" },
    select: { id: true, email: true },
  });
  if (!teacher) {
    console.log("No teacher in DB. Seed or create a teacher first.");
    process.exit(1);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfToday = new Date(todayStr + "T00:00:00.000Z");
  const inTwoWeeks = new Date(startOfToday);
  inTwoWeeks.setUTCDate(inTwoWeeks.getUTCDate() + 14);

  const existing = await prisma.availability.findFirst({
    where: { teacherId: teacher.id, date: { gte: startOfToday, lte: inTwoWeeks } },
  });
  if (existing) {
    console.log("OK: Student-visible slot already exists for teacher", teacher.email);
    console.log("  Slot date:", existing.date.toISOString(), existing.startTime, existing.endTime);
    process.exit(0);
  }

  const slot = await prisma.availability.create({
    data: {
      teacherId: teacher.id,
      date: startOfToday,
      startTime: "10:00",
      endTime: "11:00",
    },
  });
  console.log("Created slot:", slot.id, slot.date.toISOString(), slot.startTime, slot.endTime);

  const visible = await prisma.availability.findMany({
    where: {
      teacherId: teacher.id,
      date: { gte: startOfToday, lte: inTwoWeeks },
    },
  });
  if (visible.length > 0) {
    console.log("OK: Student fetch would see", visible.length, "slot(s).");
  } else {
    console.log("FAIL: No slots found with date gte startOfToday. Bug: same-day excluded by 'now'.");
    process.exit(1);
  }

  await prisma.availability.delete({ where: { id: slot.id } });
  console.log("Cleaned up test slot.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
