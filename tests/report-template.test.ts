import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeFieldConfig,
  composeSnapshot,
  parseStoredSlugs,
  isReportFieldKey,
  REPORT_FIELD_KEYS,
  TIP_SEPARATOR,
  MAX_SNAPSHOT_LENGTH,
} from "../src/lib/report-template";

const row = (over: Partial<{ key: string; label: string; helpText: string; placeholder: string; isRequired: boolean }>) => ({
  key: "summaryText",
  label: "סיכום כללי",
  helpText: "",
  placeholder: "",
  isRequired: true,
  ...over,
});

test("an empty config table yields the six defaults, in order", () => {
  const fields = mergeFieldConfig([]);
  assert.deepEqual(fields.map((f) => f.key), [...REPORT_FIELD_KEYS]);
  assert.equal(fields[0].label, "סיכום כללי");
  assert.equal(fields[0].isRequired, true);
  assert.equal(fields[3].key, "tips");
  assert.equal(fields[3].isRequired, false);
});

test("stored wording overlays the default", () => {
  const fields = mergeFieldConfig([
    row({ key: "pointsToKeep", label: "חוזקות", helpText: "מה עבד", placeholder: "כתבו כאן", isRequired: false }),
  ]);
  const keep = fields.find((f) => f.key === "pointsToKeep")!;
  assert.equal(keep.label, "חוזקות");
  assert.equal(keep.helpText, "מה עבד");
  assert.equal(keep.placeholder, "כתבו כאן");
  assert.equal(keep.isRequired, false);
});

test("a partial table leaves the other fields at their defaults", () => {
  const fields = mergeFieldConfig([row({ key: "tips", label: "רעיונות", isRequired: false })]);
  assert.equal(fields.length, REPORT_FIELD_KEYS.length);
  assert.equal(fields.find((f) => f.key === "tips")!.label, "רעיונות");
  assert.equal(fields.find((f) => f.key === "summaryText")!.label, "סיכום כללי");
});

test("an unknown key cannot add a field", () => {
  const fields = mergeFieldConfig([row({ key: "somethingElse", label: "לא אמור להופיע" })]);
  assert.deepEqual(fields.map((f) => f.key), [...REPORT_FIELD_KEYS]);
  assert.ok(!fields.some((f) => f.label === "לא אמור להופיע"));
});

test("a blanked label falls back to the default rather than rendering nameless", () => {
  const fields = mergeFieldConfig([row({ key: "summaryText", label: "   " })]);
  assert.equal(fields[0].label, "סיכום כללי");
});

test("isReportFieldKey guards writes to the config", () => {
  assert.equal(isReportFieldKey("summaryText"), true);
  assert.equal(isReportFieldKey("tips"), true);
  assert.equal(isReportFieldKey("pdfUrl"), false);
  assert.equal(isReportFieldKey("lessonId"), false);
  assert.equal(isReportFieldKey(""), false);
});

test("a snapshot joins tip bodies with the separator the PDF already renders", () => {
  assert.equal(composeSnapshot(["ראשון", "שני"], ""), `ראשון${TIP_SEPARATOR}שני`);
});

test("the teacher's free text is appended after the selected tips", () => {
  assert.equal(composeSnapshot(["ראשון"], "הערה שלי"), `ראשון${TIP_SEPARATOR}הערה שלי`);
  assert.equal(composeSnapshot([], "רק הערה"), "רק הערה");
  assert.equal(composeSnapshot(["ראשון"], "   "), "ראשון");
  assert.equal(composeSnapshot([], ""), "");
});

test("empty tip bodies never produce a stray separator", () => {
  assert.equal(composeSnapshot(["", "  ", "אמיתי"], ""), "אמיתי");
});

test("a snapshot is capped so admin text cannot make a PDF unrenderable", () => {
  const huge = "א".repeat(MAX_SNAPSHOT_LENGTH * 2);
  assert.equal(composeSnapshot([huge], "").length, MAX_SNAPSHOT_LENGTH);
});

test("stored slugs parse back, tolerating spacing and trailing separators", () => {
  assert.deepEqual(parseStoredSlugs("dafr-kvant-klali,klalim"), ["dafr-kvant-klali", "klalim"]);
  assert.deepEqual(parseStoredSlugs(" dafr-kvant-klali , klalim "), ["dafr-kvant-klali", "klalim"]);
  assert.deepEqual(parseStoredSlugs("klalim,,"), ["klalim"]);
  assert.deepEqual(parseStoredSlugs(""), []);
});

test("legacy free text does not parse as slugs", () => {
  // Pre-slug summaries stored prose here; it must not be mistaken for a slug list.
  const prose = "לתרגל שאלות כמותיות כל יום";
  assert.deepEqual(parseStoredSlugs(prose), [prose]);
});
