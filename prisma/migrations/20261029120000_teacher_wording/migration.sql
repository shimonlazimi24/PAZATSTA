-- "מדריך" became "מורה" everywhere people read; the two seeded questions follow.
UPDATE "FrontalReportField" SET "label" = 'איך היה המורה?' WHERE "id" = 'survey_default_2' AND "label" = 'איך היה המדריך?';
UPDATE "FrontalReportField" SET "options" = array_replace("options", 'סייע למדריך במהלך הסדנה', 'סייע למורה במהלך הסדנה') WHERE "id" = 'frf_f_teacher';
