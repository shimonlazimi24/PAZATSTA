import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MESSAGE_TEMPLATE,
  buildReportAnswers,
  canRegister,
  canWithdraw,
  dayStatus,
  noTeacherAlertDue,
  reminderDue,
  renderTemplate,
  unknownPlaceholders,
  wazeUrl,
  answersForRecipient,
} from "../src/lib/frontal-days";

test("placeholders are filled", () => {
  assert.equal(renderTemplate("שלום {שם_המדריך}, נתראה ב{כותרת}", { שם_המדריך: "דנה", כותרת: "אורט" }), "שלום דנה, נתראה באורט");
});

test("a line whose value is missing disappears instead of showing an empty label", () => {
  const out = renderTemplate("איפה: {כתובת}\nוואטסאפ: {וואטסאפ}\nסוף", { כתובת: "הרצל 1" });
  assert.equal(out, "איפה: הרצל 1\nסוף");
});

test("an unknown placeholder stays visible so a typo is noticed", () => {
  assert.equal(renderTemplate("שלום {שם_מדריך}", { שם_המדריך: "דנה" }), "שלום {שם_מדריך}");
  assert.deepEqual(unknownPlaceholders("שלום {שם_מדריך} ו{כותרת}"), ["שם_מדריך"]);
  assert.deepEqual(unknownPlaceholders(DEFAULT_MESSAGE_TEMPLATE), []);
});

test("blank lines left by dropped lines collapse", () => {
  assert.equal(renderTemplate("א\n\n{מצגת}\n\nב", {}), "א\n\nב");
});

test("waze link encodes the address", () => {
  assert.equal(wazeUrl("הרצל 1, תל אביב"), "https://waze.com/ul?q=%D7%94%D7%A8%D7%A6%D7%9C%201%2C%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91&navigate=yes");
  assert.equal(wazeUrl("  "), "");
});

test("the reminder is due from two days before, once", () => {
  assert.equal(reminderDue({ dateStr: "2026-12-10", todayStr: "2026-12-07", alreadySent: false }), false);
  assert.equal(reminderDue({ dateStr: "2026-12-10", todayStr: "2026-12-08", alreadySent: false }), true);
  assert.equal(reminderDue({ dateStr: "2026-12-10", todayStr: "2026-12-09", alreadySent: false }), true);
  assert.equal(reminderDue({ dateStr: "2026-12-10", todayStr: "2026-12-09", alreadySent: true }), false);
  assert.equal(reminderDue({ dateStr: "2026-12-10", todayStr: "2026-12-10", alreadySent: false }), false);
});

test("the admin is warned once when a day two weeks out has nobody", () => {
  const base = { dateStr: "2026-12-15", signedCount: 0, alreadyAlerted: false };
  assert.equal(noTeacherAlertDue({ ...base, todayStr: "2026-11-30" }), false);
  assert.equal(noTeacherAlertDue({ ...base, todayStr: "2026-12-01" }), true);
  assert.equal(noTeacherAlertDue({ ...base, todayStr: "2026-12-01", signedCount: 1 }), false);
  assert.equal(noTeacherAlertDue({ ...base, todayStr: "2026-12-01", alreadyAlerted: true }), false);
});

test("registration and withdrawal rules", () => {
  const r = { status: "open", dateStr: "2026-12-10", todayStr: "2026-11-01", teachersNeeded: 2, signedCount: 1, alreadySigned: false };
  assert.equal(canRegister(r).ok, true);
  assert.equal(canRegister({ ...r, signedCount: 2 }).ok, false);
  assert.equal(canRegister({ ...r, todayStr: "2026-12-10" }).ok, false);
  assert.equal(canRegister({ ...r, status: "canceled" }).ok, false);
  assert.equal(canWithdraw({ dateStr: "2026-12-10", todayStr: "2026-12-03" }).ok, true);
  assert.equal(canWithdraw({ dateStr: "2026-12-10", todayStr: "2026-12-04" }).ok, false);
});

test("day status tells the admin what is needed", () => {
  const s = { status: "open", dateStr: "2026-12-10", teachersNeeded: 2, signedCount: 0, report: "none" as const, sentToRecipient: false };
  assert.deepEqual(dayStatus({ ...s, todayStr: "2026-12-01" }), { label: "אין מדריכים", tone: "danger" });
  assert.deepEqual(dayStatus({ ...s, todayStr: "2026-11-01" }), { label: "אין מדריכים", tone: "warning" });
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-01", signedCount: 1 }).label, "חסר מדריך אחד");
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-01", signedCount: 2 }).tone, "ok");
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-11", signedCount: 2 }).label, "ממתין לדוח סיום");
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-11", report: "submitted" }).label, "דוח ממתין לאישור");
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-11", report: "approved", sentToRecipient: true }).label, "הדוח נשלח");
  assert.equal(dayStatus({ ...s, todayStr: "2026-12-11", status: "canceled" }).label, "בוטל");
});

test("report answers follow the admin's fields", () => {
  const fields = [
    { id: "n", label: "כמה תלמידים", kind: "number", required: true },
    { id: "s", label: "סיכום", kind: "long", required: true },
    { id: "x", label: "הערות", kind: "long", required: false },
  ];
  assert.deepEqual(buildReportAnswers(fields, { n: "30", s: " היה טוב " }), {
    ok: true,
    answers: [
      { label: "כמה תלמידים", value: "30" },
      { label: "סיכום", value: "היה טוב" },
      { label: "הערות", value: "" },
    ],
  });
  assert.equal(buildReportAnswers(fields, { n: "30" }).ok, false);
  assert.equal(buildReportAnswers(fields, { n: "שלושים", s: "x" }).ok, false);
});

// The team's real form (Google Forms) as fields.
const form = [
  { id: "count", label: "מספר משתתפים", kind: "choice", required: true, options: ["בין 5-10", "בין 10-20", "30+"] },
  { id: "teacher", label: "המורה המלווה", kind: "multi", required: true, options: ["נוכח לאורך הסדנה", "הפריע להתנהלות הסדנה", "אחר"], internal: true },
  { id: "teacherOther", label: "מה עוד לגבי המורה?", kind: "short", required: false, showIfFieldId: "teacher", showIfValues: ["אחר"], internal: true },
  { id: "discipline", label: "האם היו בעיות משמעת?", kind: "choice", required: true, options: ["לא", "כן - קלות", "כן - משמעותיות"] },
  { id: "disciplineDetail", label: "פירוט", kind: "short", required: true, showIfFieldId: "discipline", showIfValues: ["כן - קלות", "כן - משמעותיות"] },
];

test("single and multiple choice answers are stored as text, internal ones marked", () => {
  const r = buildReportAnswers(form, { count: "בין 10-20", teacher: ["נוכח לאורך הסדנה", "אחר"], teacherOther: "יצא באמצע", discipline: "לא" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.answers, [
      { label: "מספר משתתפים", value: "בין 10-20" },
      { label: "המורה המלווה", value: "נוכח לאורך הסדנה, אחר", internal: true },
      { label: "מה עוד לגבי המורה?", value: "יצא באמצע", internal: true },
      { label: "האם היו בעיות משמעת?", value: "לא" },
    ]);
  }
});

test("a follow-up is skipped while hidden, and required once it shows", () => {
  const hidden = buildReportAnswers(form, { count: "30+", teacher: ["נוכח לאורך הסדנה"], discipline: "לא" });
  assert.equal(hidden.ok && hidden.answers.some((a) => a.label === "פירוט"), false);
  const shown = buildReportAnswers(form, { count: "30+", teacher: ["נוכח לאורך הסדנה"], discipline: "כן - קלות" });
  assert.deepEqual(shown, { ok: false, message: "נא למלא: פירוט" });
});

test("an option that is not on the list is refused", () => {
  assert.equal(buildReportAnswers(form, { count: "מאה", teacher: ["אחר"], discipline: "לא" }).ok, false);
});

test("the school receives everything except internal answers", () => {
  const r = buildReportAnswers(form, { count: "30+", teacher: ["הפריע להתנהלות הסדנה"], discipline: "לא" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(answersForRecipient(r.answers).map((a) => a.label), ["מספר משתתפים", "האם היו בעיות משמעת?"]);
});
