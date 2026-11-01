-- "מורה" alone was ambiguous next to the school's own teacher; name ours.
UPDATE "FrontalReportField" SET "label" = 'איך היה המורה שהעביר את הסדנה?' WHERE "id" = 'survey_default_2' AND "label" = 'איך היה המורה?';
UPDATE "FrontalReportField" SET "options" = array_replace("options", 'סייע למורה במהלך הסדנה', 'סייע למורה מפזצט״א במהלך הסדנה') WHERE "id" = 'frf_f_teacher';
