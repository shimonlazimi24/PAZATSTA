/**
 * Fills the STAGING database with fictional people so the system can be tested.
 * Refuses to run against any database other than pazatsta-staging.
 *
 *   SEED_ADMIN_EMAIL=you@example.com DATABASE_URL=... npx tsx scripts/seed-staging.ts
 *
 * Every staging email is redirected to the QA inbox, so the fictional addresses
 * below never receive anything: their login codes arrive in that inbox, with the
 * fictional address in the subject.
 */
import { PrismaClient } from "@prisma/client";

const STAGING_PROJECT_REF = "wqmdjbhvonzoyhucdith";
const url = process.env.DATABASE_URL ?? "";
if (!url.includes(STAGING_PROJECT_REF)) {
  console.error("Refusing to seed: DATABASE_URL is not the pazatsta-staging database.");
  process.exit(1);
}
const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  console.error("Set SEED_ADMIN_EMAIL to the email you will log in to the admin with.");
  process.exit(1);
}

const prisma = new PrismaClient();

const TEACHERS = [
  { email: "dana.cohen@pazatsta-qa.com", phone: "050-0000001", name: "דנה כהן", avatarType: "female", specialties: ["צו ראשון - מבחן דפ\"ר", "צו ראשון - ראיון אישי"] },
  { email: "yossi.levi@pazatsta-qa.com", phone: "050-0000002", name: "יוסי לוי", avatarType: "male", specialties: ["יום המא\"ה - תחנות קבוצתיות", "יום המא\"ה - מבחנים פסיכוטכניים"] },
  { email: "maya.shani@pazatsta-qa.com", phone: "050-0000003", name: "מאיה שני", avatarType: "female", specialties: ["צו ראשון - מבחן דפ\"ר", "יום המא\"ה - תחנות קבוצתיות"] },
  { email: "omer.bar@pazatsta-qa.com", phone: "050-0000004", name: "עומר בר", avatarType: "male", specialties: ["צו ראשון - ראיון אישי"] },
];
const STUDENTS = [
  { email: "student.noa@pazatsta-qa.com", phone: "050-0000005", name: "נועה אברהם" },
  { email: "student.itay@pazatsta-qa.com", phone: "050-0000006", name: "איתי מזרחי" },
];

function israelDate(offsetDays: number): Date {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

async function main() {
  await prisma.user.upsert({ where: { email: adminEmail }, create: { email: adminEmail, role: "admin", name: "מנהל בדיקות" }, update: { role: "admin" } });

  for (const t of TEACHERS) {
    const user = await prisma.user.upsert({ where: { email: t.email }, create: { email: t.email, name: t.name, role: "teacher", phone: t.phone }, update: { phone: t.phone } });
    await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayName: t.name, avatarType: t.avatarType, specialties: t.specialties, bio: "מדריך/ה לבדיקות" },
      update: { specialties: t.specialties },
    });
    // Slots on the next 10 days, 16:00–20:00, so booking can be tested.
    const slots = [];
    for (let day = 1; day <= 10; day++) {
      for (const start of ["16:00", "17:00", "18:00", "19:00"]) {
        slots.push({ teacherId: user.id, date: israelDate(day), startTime: start, endTime: `${Number(start.slice(0, 2)) + 1}:00` });
      }
    }
    await prisma.availability.createMany({ data: slots, skipDuplicates: true });
  }

  for (const s of STUDENTS) {
    const user = await prisma.user.upsert({ where: { email: s.email }, create: { email: s.email, name: s.name, role: "student", phone: s.phone }, update: { phone: s.phone } });
    await prisma.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  }

  console.log(`Seeded: admin ${adminEmail}, ${TEACHERS.length} teachers with 40 slots each, ${STUDENTS.length} students.`);
}

main().finally(() => prisma.$disconnect());
