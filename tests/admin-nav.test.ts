import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_NAV, activeAdminHref, legacyAdminPath } from "../src/components/admin/admin-nav";

test("each screen highlights its own menu item", () => {
  assert.equal(activeAdminHref("/admin"), "/admin");
  assert.equal(activeAdminHref("/admin/"), "/admin");
  assert.equal(activeAdminHref("/admin/calendar"), "/admin/calendar");
  assert.equal(activeAdminHref("/admin/settings/tips"), "/admin/settings/tips");
});

test("a teacher's edit page highlights the teacher list, not the home item", () => {
  assert.equal(activeAdminHref("/admin/teachers/abc123"), "/admin/teachers");
});

test("screens reached from inside a section highlight that section", () => {
  assert.equal(activeAdminHref("/admin/teachers/new"), "/admin/teachers");
  assert.equal(activeAdminHref("/admin/group-lessons/types"), "/admin/group-lessons");
  assert.equal(activeAdminHref("/admin/frontal-days/settings"), "/admin/frontal-days");
  assert.equal(activeAdminHref("/admin/frontal-days/abc"), "/admin/frontal-days");
});

test("a path that only shares a prefix is not a match", () => {
  assert.equal(activeAdminHref("/admin/teachersx"), null);
});

test("every old ?section= link lands on a real screen", () => {
  for (const section of ["weekly", "pending", "teacher", "teachers", "summary", "tips", "report-fields"]) {
    const path = legacyAdminPath(section, null);
    assert.ok(path && activeAdminHref(path), `${section} → ${path}`);
  }
  assert.equal(legacyAdminPath("teacher-edit", "t1"), "/admin/teachers/t1");
  assert.equal(legacyAdminPath("teacher-edit", null), "/admin/teachers");
  assert.equal(legacyAdminPath(null, null), null);
  assert.equal(legacyAdminPath("nonsense", null), "/admin");
});

test("an id from an old link cannot break out of the path", () => {
  assert.equal(legacyAdminPath("teacher-edit", "../../x?y"), "/admin/teachers/..%2F..%2Fx%3Fy");
});

test("menu hrefs are unique", () => {
  const hrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
  assert.equal(new Set(hrefs).size, hrefs.length);
});
