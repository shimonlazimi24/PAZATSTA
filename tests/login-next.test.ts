import { test } from "node:test";
import assert from "node:assert/strict";
import { areaOf, loginPathFor, nextFor, safeNext } from "../src/lib/login-next";

test("only paths inside the app are kept as a destination", () => {
  assert.equal(safeNext("/teacher/group-lessons"), "/teacher/group-lessons");
  assert.equal(safeNext("/teacher/frontal-days/abc?tab=report"), "/teacher/frontal-days/abc?tab=report");
  assert.equal(safeNext("//evil.com/teacher"), "");
  assert.equal(safeNext("https://evil.com/teacher"), "");
  assert.equal(safeNext("/\\evil.com"), "");
  assert.equal(safeNext("/api/auth/logout"), "");
  assert.equal(safeNext("/teachers-are-great"), "");
  assert.equal(safeNext(undefined), "");
});

test("each path belongs to one area", () => {
  assert.equal(areaOf("/teacher"), "teacher");
  assert.equal(areaOf("/book?x=1"), "student");
  assert.equal(areaOf("/admin/calendar"), "admin");
  assert.equal(areaOf("/login"), null);
});

test("after login, the page opens only for an account that may see it", () => {
  const teacher = { role: "teacher", canAccessAdmin: false };
  const teacherAdmin = { role: "teacher", canAccessAdmin: true };
  const admin = { role: "admin", canAccessAdmin: true };
  assert.equal(nextFor(teacher, "/teacher/group-lessons"), "/teacher/group-lessons");
  assert.equal(nextFor(teacher, "/admin"), null);
  assert.equal(nextFor(teacherAdmin, "/admin/frontal-days"), "/admin/frontal-days");
  assert.equal(nextFor(admin, "/teacher/group-lessons"), null);
  assert.equal(nextFor({ role: "student", canAccessAdmin: false }, "/book"), "/book");
});

test("the login link carries the destination", () => {
  assert.equal(loginPathFor("teacher", ""), "/login/teacher");
  assert.equal(loginPathFor("teacher", "/teacher/group-lessons"), "/login/teacher?next=%2Fteacher%2Fgroup-lessons");
});
