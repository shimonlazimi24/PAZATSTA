import { test } from "node:test";
import assert from "node:assert/strict";
import { getLessonCompletedContent, SUMMARY_LINK_VALIDITY_NOTE } from "../src/lib/email";

const base = { studentName: "דנה", teacherName: "יוסי", date: "01/11/2026" };

test("the summary email warns that the link lasts one month", () => {
  const { text } = getLessonCompletedContent({ ...base, publicPdfUrl: "https://x.test/p/lesson-summary/abc" });
  assert.ok(text.includes(SUMMARY_LINK_VALIDITY_NOTE));
  assert.match(SUMMARY_LINK_VALIDITY_NOTE, /חודש/);
});

test("no link, no warning about a link", () => {
  const { text } = getLessonCompletedContent(base);
  assert.ok(!text.includes(SUMMARY_LINK_VALIDITY_NOTE));
});
