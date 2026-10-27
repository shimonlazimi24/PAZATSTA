import { test } from "node:test";
import assert from "node:assert/strict";
import { decideNotHeld } from "../src/lib/lesson-not-held";

const teacher = { isAdmin: false };
const admin = { isAdmin: true };

test("a past lesson with no report can be marked not held by its teacher", () => {
  assert.deepEqual(decideNotHeld({ status: "scheduled", lessonStarted: true, ...teacher }), {
    ok: true,
    from: "scheduled",
  });
});

test("a future lesson is not 'not held' — it is canceled the normal way", () => {
  const d = decideNotHeld({ status: "scheduled", lessonStarted: false, ...admin });
  assert.equal(d.ok, false);
});

test("only an admin can take a reported (completed) lesson out of the hours", () => {
  assert.equal(decideNotHeld({ status: "completed", lessonStarted: true, ...teacher }).ok, false);
  assert.deepEqual(decideNotHeld({ status: "completed", lessonStarted: true, ...admin }), {
    ok: true,
    from: "completed",
  });
});

test("canceled and pending lessons are refused with a reason", () => {
  for (const status of ["canceled", "pending_approval"]) {
    const d = decideNotHeld({ status, lessonStarted: true, ...admin });
    assert.equal(d.ok, false);
    assert.ok(d.ok === false && d.message.length > 0);
  }
});
