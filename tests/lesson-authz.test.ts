import { test } from "node:test";
import assert from "node:assert/strict";
import { canActOnLesson } from "../src/lib/lesson-authz";

/**
 * The bug this pins down: approve, cancel and reject each wrote the rule out by
 * hand and each tested `isTeacher` where it meant "not an admin". A teacher listed
 * in ADMIN_TEACHER_EMAILS is both, so the checks denied admins exactly what their
 * admin grant was for — reject even told the admin that only the admin could do it.
 */

const OWN = { teacherId: "teacher-1", workshopId: null };
const SOMEONE_ELSES = { teacherId: "teacher-2", workshopId: null };
const OWN_WORKSHOP = { teacherId: "teacher-1", workshopId: "workshop-1" };
const OTHER_WORKSHOP = { teacherId: "teacher-2", workshopId: "workshop-1" };

const admin = { isAdmin: true, userId: "admin-1" };
const teacher = { isAdmin: false, userId: "teacher-1" };
/** A teacher listed in ADMIN_TEACHER_EMAILS: canAccessAdmin is true for them. */
const teacherAdmin = { isAdmin: true, userId: "teacher-1" };

test("an admin may act on any lesson", () => {
  assert.equal(canActOnLesson(admin, OWN).ok, true);
  assert.equal(canActOnLesson(admin, SOMEONE_ELSES).ok, true);
  assert.equal(canActOnLesson(admin, OWN_WORKSHOP).ok, true);
  assert.equal(canActOnLesson(admin, OTHER_WORKSHOP).ok, true);
});

test("a teacher granted admin access is not blocked by the teacher rules", () => {
  // This is the regression. Every one of these returned 403 before.
  assert.equal(canActOnLesson(teacherAdmin, SOMEONE_ELSES).ok, true);
  assert.equal(canActOnLesson(teacherAdmin, OWN_WORKSHOP).ok, true);
  assert.equal(canActOnLesson(teacherAdmin, OTHER_WORKSHOP).ok, true);
});

test("a plain teacher may act on their own lesson", () => {
  assert.equal(canActOnLesson(teacher, OWN).ok, true);
});

test("a plain teacher may not act on another teacher's lesson", () => {
  const result = canActOnLesson(teacher, SOMEONE_ELSES);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "not_owner");
});

test("a plain teacher may not act on a workshop registration, even their own", () => {
  const result = canActOnLesson(teacher, OWN_WORKSHOP);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "workshop_admin_only");
});

test("every denial carries a message to show the user", () => {
  for (const lesson of [SOMEONE_ELSES, OWN_WORKSHOP]) {
    const result = canActOnLesson(teacher, lesson);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.message.trim().length > 0);
  }
});
