-- The group-lesson types the team uses (data only, no schema change).
-- New types are added; if a type with the same category and name already
-- exists it is left as is. The four placeholder types from the first release
-- are hidden, not deleted, so lessons and reports that used them keep them.
-- The admin can add, rename and hide types from /admin/group-lessons/types.

INSERT INTO "GroupLessonType" ("id", "category", "name", "sortOrder") VALUES
  ('glt_tzav_01', 'צו ראשון', 'שברים', 1),
  ('glt_tzav_02', 'צו ראשון', 'בעיות חשבון', 2),
  ('glt_tzav_03', 'צו ראשון', 'אחוזים', 3),
  ('glt_tzav_04', 'צו ראשון', 'ממוצע', 4),
  ('glt_tzav_05', 'צו ראשון', 'דרך ומהירות', 5),
  ('glt_tzav_06', 'צו ראשון', 'הספק', 6),
  ('glt_tzav_07', 'צו ראשון', 'יחס', 7),
  ('glt_tzav_08', 'צו ראשון', 'הסתברות', 8),
  ('glt_tzav_09', 'צו ראשון', 'מחוגים', 9),
  ('glt_tzav_10', 'צו ראשון', 'גאומטריה', 10),
  ('glt_tzav_11', 'צו ראשון', 'גרפים ותרשימים', 11),
  ('glt_tzav_12', 'צו ראשון', 'הבנת הוראות', 12),
  ('glt_tzav_13', 'צו ראשון', 'אנלוגיות מילוליות', 13),
  ('glt_tzav_14', 'צו ראשון', 'אנלוגיות צורניות', 14),
  ('glt_tzav_15', 'צו ראשון', 'חשיבה צורנית', 15),
  ('glt_mea_01', 'יום המאה', 'תחנת דינמיקה קבוצתית', 1),
  ('glt_mea_02', 'יום המאה', 'תחנת הדרכה', 2),
  ('glt_mea_03', 'יום המאה', 'תחנת סימולציה אישית', 3)
ON CONFLICT ("category", "name") DO NOTHING;

UPDATE "GroupLessonType" SET "active" = false
WHERE "id" IN ('glt_yom_hamea_stations', 'glt_yom_hamea_psycho', 'glt_tzav_dapar', 'glt_tzav_interview');
