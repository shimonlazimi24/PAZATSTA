import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TIP_GROUPS, getTipsForScreening } from "../src/data/tips";
import { normalizeTopicKey, tipAppliesToLesson } from "../src/lib/topic-key";

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

/** Rebuild what the migration seeds: each tip's slug, group and topic keys. */
function seededTips(): { slug: string; group: string; topicKeys: string[]; order: number }[] {
  const keysByGroup = new Map<string, Set<string>>();
  for (const topic of Object.keys(golden)) {
    for (const group of getTipsForScreening(topic)) {
      const set = keysByGroup.get(group.label) ?? new Set<string>();
      set.add(normalizeTopicKey(topic));
      keysByGroup.set(group.label, set);
    }
  }

  const rows: { slug: string; group: string; topicKeys: string[]; order: number }[] = [];
  let order = 0;
  for (const group of TIP_GROUPS) {
    const isGeneral = group.label === "כלליים";
    const topicKeys = isGeneral ? [] : Array.from(keysByGroup.get(group.label) ?? []);
    for (const tip of group.tips) {
      order += 10;
      rows.push({ slug: tip.id, group: group.label, topicKeys, order });
    }
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

test("sort order follows the flattened group order the PDF renders in", () => {
  const flattened = TIP_GROUPS.flatMap((g) => g.tips.map((t) => t.id));
  assert.deepEqual(
    SEEDED.slice().sort((a, b) => a.order - b.order).map((t) => t.slug),
    flattened,
    "the backfill joins tip texts in sortOrder; it must match getTipsDisplayText"
  );
});

test("the general group is scoped to no topics", () => {
  const general = SEEDED.filter((t) => t.group === "כלליים");
  assert.ok(general.length > 0, "expected a general group");
  for (const tip of general) assert.deepEqual(tip.topicKeys, []);
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
    assert.equal(SEEDED.find((t) => t.slug === slug)?.group, "כלליים");
  }
});
