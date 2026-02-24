/**
 * Ensure a user is set as teacher (for lazimishimon10@gmail.com or any email).
 * Run: npx tsx scripts/ensure-teacher.ts [email]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase() || "lazimishimon10@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User not found: ${email}`);
    console.log("Create the user first (e.g. log in once as student) or use Admin → הגדרת מורה to add them as teacher.");
    process.exit(1);
  }
  console.log("Found user:", { id: user.id, email: user.email, role: user.role });
  if (user.role !== "teacher") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "teacher" },
    });
    console.log("Updated role to teacher.");
  }
  await prisma.teacherProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  console.log("TeacherProfile ensured.");
  console.log("Done. The teacher should now appear in the teachers list.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
