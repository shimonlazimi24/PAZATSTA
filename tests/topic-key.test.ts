import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTopicKey,
  topicsMatch,
  tipAppliesToLesson,
  topicKeyForLesson,
  WORKSHOP_TOPIC_KEY,
} from "../src/lib/topic-key";

/**
 * These are the real divergent spellings that exist in the codebase today, not
 * invented cases: src/data/topics.ts carries two of them and src/app/book/page.tsx
 * a third. If this ever stops unifying them, tips silently vanish from reports.
 */

test("the three real spellings of the דפר topic unify", () => {
  // src/data/topics.ts carries the first two; src/app/book/page.tsx the third.
  // Stripping the quote character collapses all three to one key.
  const noGershayim = "צו ראשון - מבחן דפר";
  const asciiQuote = 'צו ראשון - מבחן דפ"ר';
  const gershayim = "צו ראשון - מבחן דפ״ר";

  assert.equal(normalizeTopicKey(noGershayim), normalizeTopicKey(asciiQuote));
  assert.equal(normalizeTopicKey(asciiQuote), normalizeTopicKey(gershayim));
  assert.equal(topicsMatch(noGershayim, gershayim), true);
});

test("gershayim and ASCII quotes are interchangeable", () => {
  assert.equal(topicsMatch('כלל חמ"ן - ראיון אישי/מקצועי', "כלל חמ״ן - ראיון אישי/מקצועי"), true);
  assert.equal(topicsMatch("ירפ״א א׳", "ירפ\"א א'"), true);
  assert.equal(topicsMatch("יום המא״ה - תחנות קבוצתיות", 'יום המא"ה - תחנות קבוצתיות'), true);
});

test("whitespace differences do not matter", () => {
  assert.equal(topicsMatch("  דפ״ר משטרה  ", "דפ״ר משטרה"), true);
  assert.equal(topicsMatch("דפ״ר   משטרה", "דפ״ר משטרה"), true);
});

test("genuinely different topics never collapse", () => {
  assert.equal(topicsMatch("צו ראשון - ראיון אישי", "צו ראשון - מבחן דפר"), false);
  assert.equal(topicsMatch("יום המא״ה - תחנות קבוצתיות", "יום המא״ה - מבחנים פסיכוטכניים"), false);
  assert.equal(topicsMatch("גדנע חובלים", "עתודה אקדמאית - ראיון אישי"), false);
});

test("an empty topic matches nothing, including another empty one", () => {
  assert.equal(topicsMatch("", ""), false);
  assert.equal(topicsMatch("", "דפ״ר משטרה"), false);
  assert.equal(topicsMatch("   ", "דפ״ר משטרה"), false);
});

test("normalizeTopicKey is idempotent", () => {
  const once = normalizeTopicKey('כלל חמ"ן - מבחני מצב (דינמיקה קבוצתית)');
  assert.equal(normalizeTopicKey(once), once);
});

test("a tip with no topics is general — offered for every lesson", () => {
  assert.equal(tipAppliesToLesson([], "דפ״ר משטרה"), true);
  assert.equal(tipAppliesToLesson([], "גדנע חובלים"), true);
  // Workshop topics are generated and match no vocabulary; general tips still apply.
  assert.equal(tipAppliesToLesson([], "סדנה · הכנה לדפר · 2026-03-14"), true);
  assert.equal(tipAppliesToLesson([], ""), true);
  assert.equal(tipAppliesToLesson([], null), true);
});

test("a scoped tip is offered only for its own topics", () => {
  const scoped = ["צו ראשון - מבחן דפר", "דפ״ר משטרה"].map(normalizeTopicKey);
  assert.equal(tipAppliesToLesson(scoped, "דפ״ר משטרה"), true);
  assert.equal(tipAppliesToLesson(scoped, 'דפ"ר משטרה'), true, "spelling drift still matches");
  assert.equal(tipAppliesToLesson(scoped, "גדנע חובלים"), false);
});

test("a scoped tip is not offered to a workshop or an untyped lesson", () => {
  const scoped = [normalizeTopicKey("צו ראשון - מבחן דפר")];
  assert.equal(tipAppliesToLesson(scoped, "סדנה · הכנה לדפר · 2026-03-14"), false);
  assert.equal(tipAppliesToLesson(scoped, ""), false);
  assert.equal(tipAppliesToLesson(scoped, null), false);
});

test("every workshop collapses to one key, so tips can be scoped to workshops", () => {
  // buildWorkshopTopicLabel produces a per-instance label; without collapsing it
  // no tip could ever be scoped to workshops, because the key changes each time.
  assert.equal(topicKeyForLesson("סדנה · הכנה לדפר · 2026-03-14"), WORKSHOP_TOPIC_KEY);
  assert.equal(topicKeyForLesson("סדנה · יום המאה · 2027-01-02"), WORKSHOP_TOPIC_KEY);

  const workshopTip = [WORKSHOP_TOPIC_KEY];
  assert.equal(tipAppliesToLesson(workshopTip, "סדנה · כל שם שהוא · 2026-05-01"), true);
  assert.equal(tipAppliesToLesson(workshopTip, "דפ״ר משטרה"), false);
});
