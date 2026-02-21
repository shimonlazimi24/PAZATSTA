import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_TEACHER_EMAIL = "teacher@test.com";
const TEST_STUDENT_EMAIL = "student@test.com";

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@paza.local" },
    create: {
      email: "admin@paza.local",
      role: "admin",
    },
    update: {},
  });

  const teacher = await prisma.user.upsert({
    where: { email: TEST_TEACHER_EMAIL },
    create: {
      email: TEST_TEACHER_EMAIL,
      name: "דני כהן",
      role: "teacher",
    },
    update: {},
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    create: { userId: teacher.id, bio: "מורה למוזיקה" },
    update: {},
  });

  const student = await prisma.user.upsert({
    where: { email: TEST_STUDENT_EMAIL },
    create: {
      email: TEST_STUDENT_EMAIL,
      name: "רוני ישראלי",
      role: "student",
    },
    update: {},
  });
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    create: { userId: student.id },
    update: {},
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
