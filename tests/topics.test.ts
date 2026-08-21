import { test } from "node:test";
import assert from "node:assert/strict";
import { teacherMatchesTopic, getTopicsToMatch } from "../src/lib/topics";

test("a teacher with no specialties matches nothing", () => {
  assert.equal(teacherMatchesTopic([], "צו ראשון - מבחן דפר"), false);
});

test("an exact specialty match is accepted", () => {
  assert.equal(teacherMatchesTopic(["צו ראשון - מבחן דפר"], "צו ראשון - מבחן דפר"), true);
});

test("a teacher specialising elsewhere is rejected", () => {
  assert.equal(teacherMatchesTopic(["קורס טיס - ירפ״א א׳"], "צו ראשון - מבחן דפר"), false);
});

test("getTopicsToMatch always includes the topic itself", () => {
  const topic = "צו ראשון - מבחן דפר";
  assert.ok(getTopicsToMatch(topic).includes(topic));
});
