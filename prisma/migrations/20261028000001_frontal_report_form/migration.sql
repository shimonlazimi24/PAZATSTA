-- Frontal-day closing report: richer field types, and the team's own form.
-- Additive columns; the four starter fields are hidden (not deleted) so reports
-- already filed keep their answers. Admin edits fields at /admin/frontal-days/settings.

ALTER TABLE "FrontalReportField" ADD COLUMN "help" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FrontalReportField" ADD COLUMN "options" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FrontalReportField" ADD COLUMN "showIfFieldId" TEXT;
ALTER TABLE "FrontalReportField" ADD COLUMN "showIfValues" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FrontalReportField" ADD COLUMN "internal" BOOLEAN NOT NULL DEFAULT false;

UPDATE "FrontalReportField" SET "active" = false
WHERE "id" IN ('frf_participants', 'frf_summary', 'frf_highlights', 'frf_issues');

INSERT INTO "FrontalReportField" ("id", "label", "kind", "required", "sortOrder", "active", "help", "options", "showIfFieldId", "showIfValues", "internal") VALUES
  ('frf_f_topic', 'נושא הסדנה (פר קבוצה)', 'short', true, 1, true, 'ניתן לכתוב יותר מנושא אחד.', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_count', 'מספר משתתפים', 'choice', true, 2, true, '', ARRAY['בין 5-10','בין 10-20','בין 20-30','30+']::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_general', 'סיכום כללי - איך הייתה הסדנה?', 'long', true, 3, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_teacher', 'המורה המלווה', 'multi', true, 4, true, 'אפשר לבחור יותר מתשובה אחת.', ARRAY['נוכח לאורך הסדנה','הקפיד על המשמעת','סייע למדריך במהלך הסדנה','לא היה נוכח','הפריע להתנהלות הסדנה','אחר']::TEXT[], NULL, ARRAY[]::TEXT[], true),
  ('frf_f_teacher_other', 'מה עוד לגבי המורה המלווה?', 'short', false, 5, true, '', ARRAY[]::TEXT[], 'frf_f_teacher', ARRAY['אחר']::TEXT[], true),
  ('frf_f_discipline', 'האם היו בעיות משמעת?', 'choice', true, 6, true, '', ARRAY['לא','כן - קלות','כן - משמעותיות']::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_discipline_detail', 'פירוט בעיות המשמעת', 'short', false, 7, true, '', ARRAY[]::TEXT[], 'frf_f_discipline', ARRAY['כן - קלות','כן - משמעותיות']::TEXT[], false),
  ('frf_f_completed', 'האם סיימתי את כל הנושאים שתוכננו?', 'choice', false, 8, true, '', ARRAY['כן','לא']::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_completed_detail', 'אילו נושאים לא הועברו?', 'short', false, 9, true, '', ARRAY[]::TEXT[], 'frf_f_completed', ARRAY['לא']::TEXT[], false),
  ('frf_f_overtime', 'האם היו חריגות בזמנים?', 'choice', true, 10, true, '', ARRAY['לא','כן']::TEXT[], NULL, ARRAY[]::TEXT[], false),
  ('frf_f_overtime_detail', 'פירוט החריגות בזמנים', 'short', false, 11, true, '', ARRAY[]::TEXT[], 'frf_f_overtime', ARRAY['כן']::TEXT[], false),
  ('frf_f_keep', 'נקודה לשימור - מה עשיתי טוב בהדרכה וכדאי לי להמשיך לעשות?', 'long', true, 12, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], true),
  ('frf_f_improve', 'נקודה לשיפור - מה הייתי רוצה לשפר בהדרכה הבאה?', 'long', true, 13, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], true),
  ('frf_f_improve_org', 'נקודה לשיפור עבור פזצט"א - מה לדעתך אפשר לשפר בהדרכה, בתפעול, בלוגיסטיקה או בתהליך עצמו?', 'long', true, 14, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], true)
ON CONFLICT ("id") DO NOTHING;
