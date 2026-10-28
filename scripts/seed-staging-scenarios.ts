/**
 * Fills the STAGING database with a realistic mix of every situation the system
 * handles, so each screen has something to show. Run after seed-staging.ts.
 * Refuses to run against any database other than pazatsta-staging.
 *
 * It replaces earlier mock data: all lessons of the QA teachers, and all group
 * lessons and frontal days (staging holds test data only).
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_CHECKLIST, DEFAULT_MESSAGE_TEMPLATE, DEFAULT_REMINDER_TEMPLATE } from "../src/lib/frontal-days";

const STAGING_PROJECT_REF = "wqmdjbhvonzoyhucdith";
const dbUrl = process.env.DATABASE_URL ?? "";
const localTest = process.env.SEED_ALLOW_LOCAL === "1" && /@localhost[:/]/.test(dbUrl);
if (!dbUrl.includes(STAGING_PROJECT_REF) && !localTest) {
  console.error("Refusing to seed: DATABASE_URL is not the pazatsta-staging database.");
  process.exit(1);
}

const prisma = new PrismaClient();
const H = 3_600_000;

const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
/** UTC midnight of the Israeli date `offset` days from today (the app's date convention). */
function day(offset: number): Date {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
const monthKey = (offsetMonths: number) => {
  const [y, m] = todayStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offsetMonths, 1));
  return d.toISOString().slice(0, 7);
};
const inMonth = (key: string, dayOfMonth: number) => new Date(`${key}-${String(dayOfMonth).padStart(2, "0")}T00:00:00.000Z`);

const TEACHERS = {
  dana: "dana.cohen@pazatsta-qa.com",
  yossi: "yossi.levi@pazatsta-qa.com",
  maya: "maya.shani@pazatsta-qa.com",
  omer: "omer.bar@pazatsta-qa.com",
};
const STUDENTS = [
  { email: "student.noa@pazatsta-qa.com", name: "נועה אברהם", parent: "מיכל אברהם", parentEmail: "parent.noa@pazatsta-qa.com", topic: "צו ראשון - מבחן דפ\"ר" },
  { email: "student.itay@pazatsta-qa.com", name: "איתי מזרחי", parent: "רונן מזרחי", parentEmail: "parent.itay@pazatsta-qa.com", topic: "צו ראשון - ראיון אישי" },
  { email: "student.shira@pazatsta-qa.com", name: "שירה כץ", parent: "דנה כץ", parentEmail: "parent.shira@pazatsta-qa.com", topic: "יום המא\"ה - תחנות קבוצתיות" },
  { email: "student.ido@pazatsta-qa.com", name: "עידו פרץ", parent: "אבי פרץ", parentEmail: "parent.ido@pazatsta-qa.com", topic: "צו ראשון - מבחן דפ\"ר" },
  { email: "student.yael@pazatsta-qa.com", name: "יעל גולן", parent: "סיגל גולן", parentEmail: "parent.yael@pazatsta-qa.com", topic: "יום המא\"ה - מבחנים פסיכוטכניים" },
];

async function main() {
  const t: Record<keyof typeof TEACHERS, { id: string; name: string | null }> = {} as never;
  for (const [key, email] of Object.entries(TEACHERS)) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!u) throw new Error(`Run seed-staging.ts first: ${email} is missing`);
    t[key as keyof typeof TEACHERS] = u;
  }
  const s: { id: string; topic: string }[] = [];
  for (const st of STUDENTS) {
    const u = await prisma.user.upsert({ where: { email: st.email }, create: { email: st.email, name: st.name, role: "student", phone: "050-0000000" }, update: { name: st.name } });
    await prisma.studentProfile.upsert({
      where: { userId: u.id },
      create: { userId: u.id, studentFullName: st.name, parentFullName: st.parent, parentEmail: st.parentEmail, currentScreeningType: st.topic },
      update: { studentFullName: st.name, parentFullName: st.parent, parentEmail: st.parentEmail, currentScreeningType: st.topic },
    });
    s.push({ id: u.id, topic: st.topic });
  }

  // Start clean.
  const teacherIds = Object.values(t).map((x) => x.id);
  await prisma.lesson.deleteMany({ where: { teacherId: { in: teacherIds } } });
  await prisma.groupLesson.deleteMany({});
  await prisma.frontalDay.deleteMany({});
  await prisma.groupLessonNotice.deleteMany({});

  const now = Date.now();
  type L = { teacher: keyof typeof TEACHERS; student: number; day: number; start: string; status: "pending_approval" | "scheduled" | "completed" | "canceled"; createdHoursAgo?: number; summary?: boolean };
  const lessons: L[] = [
    // דנה: everything a teacher sees on her home page
    { teacher: "dana", student: 0, day: -1, start: "17:00", status: "scheduled" }, // past, waiting for a report
    { teacher: "dana", student: 1, day: -2, start: "18:00", status: "scheduled" }, // past, waiting for a report
    { teacher: "dana", student: 2, day: -3, start: "16:00", status: "completed", summary: true }, // report sent, PDF opens
    { teacher: "dana", student: 3, day: -4, start: "19:00", status: "canceled" }, // marked "did not happen"
    { teacher: "dana", student: 4, day: 1, start: "17:00", status: "scheduled" }, // tomorrow
    { teacher: "dana", student: 0, day: 3, start: "18:00", status: "pending_approval", createdHoursAgo: 7 }, // 17h left, got the first reminder
    { teacher: "dana", student: 1, day: 4, start: "19:00", status: "pending_approval", createdHoursAgo: 20 }, // 4h left, urgent
    // יוסי
    { teacher: "yossi", student: 2, day: -1, start: "16:00", status: "scheduled" }, // past, waiting for a report
    { teacher: "yossi", student: 3, day: 2, start: "17:00", status: "pending_approval", createdHoursAgo: 1 }, // fresh request
    { teacher: "yossi", student: 4, day: 2, start: "18:00", status: "scheduled" },
    { teacher: "yossi", student: 0, day: 5, start: "16:00", status: "scheduled" },
    // מאיה: last month's hours
    { teacher: "maya", student: 1, day: -20, start: "16:00", status: "completed", summary: true },
    { teacher: "maya", student: 2, day: -18, start: "17:00", status: "completed", summary: true },
    { teacher: "maya", student: 3, day: 0, start: "19:00", status: "scheduled" }, // today
    // עומר: one request, nothing else (empty states)
    { teacher: "omer", student: 4, day: 6, start: "16:00", status: "pending_approval", createdHoursAgo: 2 },
  ];
  for (const l of lessons) {
    const end = `${String(Number(l.start.slice(0, 2)) + 1).padStart(2, "0")}:00`;
    const createdAt = new Date(now - (l.createdHoursAgo ?? 72) * H);
    // The slot is taken, so it leaves the teacher's availability.
    await prisma.availability.deleteMany({ where: { teacherId: t[l.teacher].id, date: day(l.day), startTime: l.start } });
    const lesson = await prisma.lesson.create({
      data: {
        teacherId: t[l.teacher].id,
        studentId: s[l.student].id,
        date: day(l.day),
        startTime: l.start,
        endTime: end,
        topic: s[l.student].topic,
        status: l.status,
        createdAt,
        approvalExpiresAt: new Date(createdAt.getTime() + 24 * H),
        approvedByTeacherAt: l.status === "pending_approval" ? null : new Date(createdAt.getTime() + 3 * H),
        reportCompleted: l.status === "completed",
        canceledAt: l.status === "canceled" ? new Date(now - 24 * H) : null,
      },
    });
    if (l.summary) {
      await prisma.lessonSummary.create({
        data: {
          lessonId: lesson.id,
          summaryText: "עבדנו על שאלות כמותיות וסדרות. ההתקדמות טובה, במיוחד בזמני הפתרון.",
          pointsToKeep: "ריכוז לאורך כל השיעור ושאלות טובות",
          pointsToImprove: "לקרוא את השאלה עד הסוף לפני שמתחילים לפתור",
          recommendations: "לתרגל 20 דקות ביום עד השיעור הבא",
          homeworkText: "סט תרגול מספר 3",
          tipsSnapshot: "לסמן שאלות קשות ולחזור אליהן בסוף",
        },
      });
    }
    if (l.status === "pending_approval" && (l.createdHoursAgo ?? 0) >= 6) {
      await prisma.approvalReminder.create({ data: { lessonId: lesson.id, teacherId: t[l.teacher].id, mark: 18, channel: "email", sentAt: new Date(createdAt.getTime() + 6 * H) } });
    }
    if (l.status === "pending_approval" && (l.createdHoursAgo ?? 0) >= 12) {
      await prisma.approvalReminder.create({ data: { lessonId: lesson.id, teacherId: t[l.teacher].id, mark: 12, channel: "email", sentAt: new Date(createdAt.getTime() + 12 * H) } });
    }
  }

  // Group lessons
  const types = await prisma.groupLessonType.findMany({ where: { active: true } });
  const typeId = (name: string) => types.find((x) => x.name === name)?.id ?? types[0].id;
  const thisM = monthKey(0);
  const nextM = monthKey(1);
  const pastDay = Math.max(1, Number(todayStr.slice(8, 10)) - 3);
  const gl = async (date: Date, type: string, start: string, needed: number, signed: (keyof typeof TEACHERS)[], opts: { report?: keyof typeof TEACHERS; canceled?: boolean; location?: string } = {}) => {
    const g = await prisma.groupLesson.create({
      data: {
        typeId: typeId(type),
        date,
        startTime: start,
        endTime: `${String(Number(start.slice(0, 2)) + 3).padStart(2, "0")}:00`,
        location: opts.location ?? "מתנ\"ס רמת גן, כיתה 3",
        details: "להביא מחשב נייד ודפי תרגול מודפסים. חניה בחניון הציבורי ממול.",
        teachersNeeded: needed,
        status: opts.canceled ? "canceled" : "open",
      },
    });
    for (const k of signed) await prisma.groupLessonSignup.create({ data: { groupLessonId: g.id, teacherId: t[k].id } });
    if (opts.report) {
      const type2 = types.find((x) => x.id === g.typeId)!;
      await prisma.groupLessonReport.create({ data: { groupLessonId: g.id, teacherId: t[opts.report].id, typeLabel: `${type2.category} – ${type2.name}`, participants: 18, notes: "קבוצה מגובשת, התחנה השלישית ארכה יותר מהמתוכנן." } });
    }
  };
  await gl(inMonth(thisM, pastDay), "שברים", "09:00", 1, ["dana"]); // past, Dana still owes a report
  await gl(inMonth(thisM, Math.max(1, pastDay - 1)), "תחנת דינמיקה קבוצתית", "10:00", 2, ["yossi", "maya"], { report: "yossi" }); // report in
  await gl(day(2), "אחוזים", "16:00", 2, ["maya"]); // upcoming, one place left
  await gl(day(4), "תחנת הדרכה", "09:00", 1, [], { canceled: true });
  await gl(inMonth(nextM, 5), "הסתברות", "09:00", 2, ["dana"]);
  await gl(inMonth(nextM, 12), "תחנת סימולציה אישית", "10:00", 2, []);
  await gl(inMonth(nextM, 19), "אנלוגיות מילוליות", "16:00", 1, ["yossi"]);
  await gl(inMonth(nextM, 26), "גאומטריה", "09:00", 3, []);

  // Frontal days
  const fd = async (o: {
    title: string;
    offset: number;
    address: string;
    needed: number;
    signed: { k: keyof typeof TEACHERS; done: number }[];
    report?: { k: keyof typeof TEACHERS; status: "submitted" | "approved" | "returned"; note?: string };
  }) => {
    const d = await prisma.frontalDay.create({
      data: {
        title: o.title,
        date: day(o.offset),
        startTime: "08:30",
        endTime: "13:00",
        address: o.address,
        topic: "הכנה ליום המא״ה ולמבחני הדפ״ר",
        presentationUrl: "https://drive.google.com/presentation-example",
        contactName: "רונית, רכזת השכבה",
        contactPhone: "050-1234567",
        whatsappUrl: "https://chat.whatsapp.com/ExampleInvite",
        feedbackUrl: "https://forms.gle/feedback-example",
        courseCode: "PAZA-2026",
        courseUrl: "https://course.example.com/gift",
        recipientName: "רונית",
        recipientEmail: "school.qa@pazatsta-qa.com",
        teachersNeeded: o.needed,
        messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
        reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
        checklist: DEFAULT_CHECKLIST,
      },
    });
    for (const x of o.signed) {
      await prisma.frontalDaySignup.create({ data: { dayId: d.id, teacherId: t[x.k].id, checklistDone: DEFAULT_CHECKLIST.slice(0, x.done) } });
    }
    if (o.report) {
      await prisma.frontalDayReport.create({
        data: {
          dayId: d.id,
          teacherId: t[o.report.k].id,
          status: o.report.status,
          adminNote: o.report.note ?? "",
          answers: [
            { label: "שם המדריך", value: o.report.k === "dana" ? "דנה" : "יוסי" },
            { label: "מיקום", value: `${o.title}, ${o.address}` },
            { label: "נושא הסדנה", value: "הכנה לצו ראשון: שאלון דפ״ר וראיון אישי" },
            { label: "כמות המשתתפים", value: "30+" },
            { label: "איך הייתה הסדנה באופן כללי?", value: "יום מוצלח. התלמידים היו מעורבים מאוד בתחנות ובתרגול הראיון האישי." },
            { label: "המורה בכיתה", value: "נוכח לאורך הסדנה, סייע למדריך במהלך הסדנה", internal: true },
            { label: "היו בעיות משמעת?", value: "כן - קלות" },
            { label: "פרט על בעיות המשמעת", value: "שני תלמידים דיברו בטלפון, הסתדר אחרי הערה." },
            { label: "האם הספקת את כל התכנים?", value: "כן" },
            { label: "האם הסדנה חרגה מהזמן?", value: "לא" },
            { label: "מה כדאי לשמר?", value: "התרגול בזוגות והסימולציה של יום המא״ה", internal: true },
            { label: "מה כדאי לשפר?", value: "המקרן בכיתה השנייה לא עבד בהתחלה", internal: true },
          ],
          approvedAt: o.report.status === "approved" ? new Date(now - 48 * H) : null,
          sentToRecipientAt: o.report.status === "approved" ? new Date(now - 48 * H) : null,
        },
      });
    }
  };
  await fd({ title: "תיכון אורט רמת גן", offset: 0, address: "הרצל 1, רמת גן", needed: 2, signed: [{ k: "dana", done: 3 }, { k: "yossi", done: 5 }] }); // today
  await fd({ title: "מקיף ג׳ באר שבע", offset: 10, address: "רגר 50, באר שבע", needed: 2, signed: [] }); // nobody, within 2 weeks
  await fd({ title: "חטיבת שחר חולון", offset: 25, address: "ביאליק 5, חולון", needed: 2, signed: [{ k: "maya", done: 1 }] }); // one more needed
  await fd({ title: "תיכון ברנר", offset: -5, address: "ברנר 10, פתח תקווה", needed: 2, signed: [{ k: "yossi", done: 5 }, { k: "omer", done: 5 }], report: { k: "yossi", status: "submitted" } });
  await fd({ title: "אולפנת צביה", offset: -12, address: "הנשיא 3, ירושלים", needed: 1, signed: [{ k: "maya", done: 5 }], report: { k: "maya", status: "approved" } });
  await fd({ title: "ישיבה תיכונית נווה", offset: -3, address: "החורש 4, רעננה", needed: 1, signed: [{ k: "dana", done: 4 }] }); // over, no report yet

  console.log(`Scenarios seeded: ${lessons.length} private lessons, 8 group lessons, 6 frontal days.`);
}

main().finally(() => prisma.$disconnect());
