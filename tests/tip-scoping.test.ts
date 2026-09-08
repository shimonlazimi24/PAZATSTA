import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tipAppliesToLesson } from "../src/lib/topic-key";

/**
 * The safety net for moving tips into the database.
 *
 * `tests/fixtures-golden-tips.json` records which tips every real lesson-type
 * label resolves to under the regex mapping that shipped before this change. The
 * migration seeds `Tip.topics` from that same mapping, so replaying it through
 * the new key-based matching must produce identical results for every label.
 *
 * If this fails, the seeded scoping has drifted from what teachers see today and
 * some lesson type has silently lost or gained tips.
 */

const golden: Record<string, string[]> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures-golden-tips.json"), "utf8")
);

/**
 * Read the seed straight out of the migration — the artifact that actually runs
 * against the database — rather than recomputing it. If someone edits the
 * migration by hand, this notices.
 */
function seededTips(): { slug: string; topicKeys: string[]; order: number }[] {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "prisma", "migrations", "20260908000000_report_template", "migration.sql"),
    "utf8"
  );
  const rows: { slug: string; topicKeys: string[]; order: number }[] = [];
  for (const block of sql.split('INSERT INTO "Tip"').slice(1)) {
    const stmt = block.slice(0, block.indexOf("ON CONFLICT"));
    // Tag-agnostic: the generator picks a dollar-quote tag that avoids collisions.
    const slug = /VALUES \('seed-tip-' \|\| \$(\w+)\$([\s\S]+?)\$\1\$/.exec(stmt)?.[2];
    // The array literal and sortOrder are the last two positional values.
    const tail = /, '\{(.*?)\}', (\d+), false/.exec(stmt);
    if (!slug || !tail) continue;
    const topicKeys = tail[1]
      ? tail[1]
          .split('","')
          .map((k) => k.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
          .filter(Boolean)
      : [];
    rows.push({ slug, topicKeys, order: Number(tail[2]) });
  }
  return rows;
}

const SEEDED = seededTips();

/** What the new matching returns for a lesson topic, in seeded sort order. */
function resolveSlugs(lessonTopic: string): string[] {
  return SEEDED.filter((t) => tipAppliesToLesson(t.topicKeys, lessonTopic))
    .sort((a, b) => a.order - b.order)
    .map((t) => t.slug);
}

test("the migration seeds all 18 tips", () => {
  assert.equal(SEEDED.length, 18, "parsed a different number of INSERTs than expected");
});

test("the golden fixture covers every topic and is not empty", () => {
  const topics = Object.keys(golden);
  assert.ok(topics.length >= 29, `expected the full label universe, got ${topics.length}`);
  assert.ok(topics.some((t) => golden[t].length > 0), "fixture records no tips at all");
});

test("every lesson type that has tips today keeps exactly those tips", () => {
  const drifted: string[] = [];
  for (const [topic, expected] of Object.entries(golden)) {
    if (expected.length === 0) continue;
    const actual = resolveSlugs(topic);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      drifted.push(`${topic}\n    was: ${expected.join(",")}\n    now: ${actual.join(",")}`);
    }
  }
  assert.deepEqual(drifted, [], `scoping drifted for ${drifted.length} topic(s):\n  ${drifted.join("\n  ")}`);
});

test("seeded slugs are unique — a reused slug would rewrite history", () => {
  const slugs = SEEDED.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("sort order is strictly increasing — the backfill joins texts in that order", () => {
  const orders = SEEDED.map((t) => t.order);
  assert.deepEqual(orders, orders.slice().sort((a, b) => a - b));
  assert.equal(new Set(orders).size, orders.length, "ties would make the join order undefined");
});

test("some tips are general, so every lesson type gets at least one", () => {
  const general = SEEDED.filter((t) => t.topicKeys.length === 0);
  assert.ok(general.length > 0, "expected at least one unscoped tip");
});

test("lesson types with no tips today now receive the general ones", () => {
  // A deliberate, visible consequence of making the general group topic-less:
  // it was previously withheld from types the regex did not match at all.
  const untyped = Object.entries(golden).find(([, v]) => v.length === 0);
  assert.ok(untyped, "expected at least one topic with no tips today");
  const [topic] = untyped;
  const resolved = resolveSlugs(topic);
  assert.ok(resolved.length > 0, `${topic} should now get the general tips`);
  for (const slug of resolved) {
    assert.deepEqual(SEEDED.find((t) => t.slug === slug)?.topicKeys, []);
  }
});
