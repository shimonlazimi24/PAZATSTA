import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSurvey, surveyOpen, surveyRatio } from "../src/lib/frontal-survey";
import { buildReportAnswers } from "../src/lib/frontal-days";

test("the survey ratio shows how many of the class answered", () => {
  assert.equal(surveyRatio(23, 30), "23 מתוך 30 ענו (77%)");
  assert.equal(surveyRatio(0, 30), "0 מתוך 30 ענו (0%)");
  assert.equal(surveyRatio(5, null), "5 ענו");
  assert.equal(surveyRatio(1, null), "תלמיד אחד ענה");
  assert.equal(surveyRatio(0, null), "עוד אף אחד לא ענה");
});

test("the survey is open from the day before until two weeks after, and never on a canceled day", () => {
  const day = "2026-11-10";
  assert.equal(surveyOpen({ dateStr: day, todayStr: "2026-11-08", status: "open" }), false);
  assert.equal(surveyOpen({ dateStr: day, todayStr: "2026-11-09", status: "open" }), true);
  assert.equal(surveyOpen({ dateStr: day, todayStr: "2026-11-24", status: "open" }), true);
  assert.equal(surveyOpen({ dateStr: day, todayStr: "2026-11-25", status: "open" }), false);
  assert.equal(surveyOpen({ dateStr: day, todayStr: day, status: "canceled" }), false);
});

test("answers are summed per question: option counts, averages and free text", () => {
  const questions = [
    { label: "מועיל?", kind: "choice", options: ["מאוד", "קצת"] },
    { label: "מה למדת?", kind: "multi", options: ["א", "ב"] },
    { label: "ציון", kind: "number" },
    { label: "הערות", kind: "long" },
  ];
  const responses = [
    [{ label: "מועיל?", value: "מאוד" }, { label: "מה למדת?", value: "א, ב" }, { label: "ציון", value: "9" }, { label: "הערות", value: "כיף" }],
    [{ label: "מועיל?", value: "מאוד" }, { label: "מה למדת?", value: "ב" }, { label: "ציון", value: "8" }],
    [{ label: "מועיל?", value: "קצת" }, { label: "שאלה ישנה", value: "משהו" }],
  ];
  const s = summarizeSurvey(questions, responses);
  assert.deepEqual(s[0], { label: "מועיל?", kind: "choice", answered: 3, counts: [{ option: "מאוד", count: 2 }, { option: "קצת", count: 1 }] });
  assert.deepEqual(s[1], { label: "מה למדת?", kind: "choice", answered: 2, counts: [{ option: "א", count: 1 }, { option: "ב", count: 2 }] });
  assert.deepEqual(s[2], { label: "ציון", kind: "number", answered: 2, average: 8.5 });
  assert.deepEqual(s[3], { label: "הערות", kind: "text", answered: 1, texts: ["כיף"] });
  // A question removed later still shows its answers, after the current ones.
  assert.deepEqual(s[4], { label: "שאלה ישנה", kind: "text", answered: 1, texts: ["משהו"] });
});

test("a survey form left completely blank is not an answer", () => {
  const questions = [
    { id: "q1", label: "מה עזר?", kind: "long", required: false, options: [], internal: false, showIfFieldId: null, showIfValues: [] },
    { id: "q2", label: "מה לשפר?", kind: "long", required: false, options: [], internal: false, showIfFieldId: null, showIfValues: [] },
  ];
  const blank = buildReportAnswers(questions, {});
  assert.ok(blank.ok);
  // Optional questions still produce (empty) answers, so "nothing answered" must look at the values.
  assert.equal(blank.answers.length, 2);
  assert.ok(blank.answers.every((a) => !a.value));
  const one = buildReportAnswers(questions, { q2: "פחות הרצאה" });
  assert.ok(one.ok);
  assert.ok(!one.answers.every((a) => !a.value));
});
