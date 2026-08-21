import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreAvailabilityForLesson } from "../src/lib/expire-pending-lessons";
import { availabilityDateFromYYYYMMDD, formatIsraelYYYYMMDD } from "../src/lib/dates";

/** Minimal stand-in for a Prisma transaction client, recording what was written. */
function fakeTx() {
  const upserts: { where: unknown; create: Record<string, unknown> }[] = [];
  return {
    calls: upserts,
    availability: {
      upsert: async (args: { where: unknown; create: Record<string, unknown> }) => {
        upserts.push(args);
        return args.create;
      },
    },
  };
}

test("a restored slot is keyed at midnight UTC of the Israel calendar day", async () => {
  const tx = fakeTx();
  // 21:30 UTC in summer is already the next day in Israel; the slot must be filed
  // under the Israel day, not the UTC one.
  await restoreAvailabilityForLesson(tx as never, {
    id: "l1",
    teacherId: "t1",
    date: new Date("2026-07-01T21:30:00.000Z"),
    startTime: "10:00",
    endTime: "11:00",
    workshopId: null,
  });

  assert.equal(tx.calls.length, 1);
  const created = tx.calls[0].create as { date: Date };
  assert.equal(created.date.toISOString(), "2026-07-02T00:00:00.000Z");
});

test("the restored date matches what the availability writer would produce", async () => {
  const tx = fakeTx();
  const lessonDate = new Date("2026-03-15T12:00:00.000Z");
  await restoreAvailabilityForLesson(tx as never, {
    id: "l2",
    teacherId: "t1",
    date: lessonDate,
    startTime: "09:00",
    endTime: "10:00",
    workshopId: null,
  });

  // This equality is the whole point: a mismatch means the unique index on
  // (teacherId, date, startTime) stops deduplicating and slots go missing.
  const expected = availabilityDateFromYYYYMMDD(formatIsraelYYYYMMDD(lessonDate));
  const created = tx.calls[0].create as { date: Date };
  assert.equal(created.date.getTime(), expected.getTime());
});

test("workshop lessons do not restore a slot", async () => {
  const tx = fakeTx();
  await restoreAvailabilityForLesson(tx as never, {
    id: "l3",
    teacherId: "t1",
    date: new Date("2026-03-15T00:00:00.000Z"),
    startTime: "09:00",
    endTime: "10:00",
    workshopId: "w1",
  });
  assert.equal(tx.calls.length, 0, "workshop seats are not slot-based");
});
