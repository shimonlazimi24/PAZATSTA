export const MOCK_TEACHER = {
  id: "t1",
  name: "דני כהן",
  email: "dani@example.com",
};

export const MOCK_TEACHERS = [
  { id: "t1", name: "דני כהן", email: "dani@example.com", bio: "מורה לגיטרה קלאסית ואקוסטית" },
  { id: "t2", name: "מיכל לוי", email: "michal@example.com", bio: "מומחית לג'אז ובלוז" },
  { id: "t3", name: "יוסי אברהם", email: "yossi@example.com", bio: "מורה לגיטרה חשמלית" },
];

export const MOCK_LESSONS = [
  { id: "l1", studentName: "רוני ישראלי", date: "2025-02-20", time: "10:00", status: "scheduled" as const },
  { id: "l2", studentName: "נועה פרץ", date: "2025-02-20", time: "14:00", status: "scheduled" as const },
  { id: "l3", studentName: "איתי דוד", date: "2025-02-19", time: "16:00", status: "completed" as const },
  { id: "l4", studentName: "שירה גולן", date: "2025-02-18", time: "11:00", status: "completed" as const },
  { id: "l5", studentName: "עומר ברק", date: "2025-02-17", time: "09:00", status: "canceled" as const },
];

export const MOCK_AVAILABILITY = [
  { id: "a1", date: "2025-02-24", startTime: "09:00", endTime: "10:00" },
  { id: "a2", date: "2025-02-24", startTime: "10:00", endTime: "11:00" },
  { id: "a3", date: "2025-02-25", startTime: "14:00", endTime: "15:00" },
  { id: "a4", date: "2025-02-26", startTime: "16:00", endTime: "17:00" },
];

export const MOCK_SLOTS = [
  { id: "s1", date: "2025-02-24", startTime: "09:00", endTime: "10:00" },
  { id: "s2", date: "2025-02-24", startTime: "14:00", endTime: "15:00" },
  { id: "s3", date: "2025-02-25", startTime: "10:00", endTime: "11:00" },
];

export const MOCK_MY_LESSONS = [
  { id: "ml1", teacherName: "דני כהן", date: "2025-02-22", time: "10:00", status: "upcoming" as const, hasSummary: false },
  { id: "ml2", teacherName: "מיכל לוי", date: "2025-02-20", time: "14:00", status: "upcoming" as const, hasSummary: false },
  { id: "ml3", teacherName: "דני כהן", date: "2025-02-15", time: "10:00", status: "past" as const, hasSummary: true },
  { id: "ml4", teacherName: "יוסי אברהם", date: "2025-02-10", time: "16:00", status: "past" as const, hasSummary: true },
];

export const MOCK_INVITES = [
  { id: "i1", email: "teacher@example.com", role: "מורה" as const, status: "pending" as const, expiresAt: "2025-03-01" },
  { id: "i2", email: "student@example.com", role: "תלמיד" as const, status: "used" as const, expiresAt: "2025-02-25" },
  { id: "i3", email: "parent@example.com", role: "הורה" as const, status: "expired" as const, expiresAt: "2025-02-10" },
];

export const MOCK_LESSON_DETAIL = {
  id: "l1",
  studentName: "רוני ישראלי",
  studentEmail: "roni@example.com",
  date: "2025-02-20",
  time: "10:00–11:00",
  summary: "",
  homework: "",
};

export const STATS_TODAY = 2;
export const STATS_WEEK = 8;
export const STATS_PENDING_SUMMARY = 3;
