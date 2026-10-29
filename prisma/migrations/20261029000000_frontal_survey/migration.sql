-- Students' feedback survey for frontal days. Additive only.

ALTER TABLE "FrontalDay" ADD COLUMN "classSize" INTEGER;

ALTER TABLE "FrontalReportField" ADD COLUMN "form" TEXT NOT NULL DEFAULT 'report';
CREATE INDEX "FrontalReportField_form_active_idx" ON "FrontalReportField"("form", "active");

CREATE TABLE "FrontalSurveyResponse" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrontalSurveyResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrontalSurveyResponse_dayId_clientKey_key" ON "FrontalSurveyResponse"("dayId", "clientKey");
CREATE INDEX "FrontalSurveyResponse_dayId_idx" ON "FrontalSurveyResponse"("dayId");
ALTER TABLE "FrontalSurveyResponse" ADD CONSTRAINT "FrontalSurveyResponse_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "FrontalDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starting questions; the admin edits them under the frontal-day settings.
INSERT INTO "FrontalReportField" ("id", "label", "kind", "required", "sortOrder", "active", "help", "options", "showIfFieldId", "showIfValues", "internal", "form") VALUES
  ('survey_default_1', 'כמה היום היה מועיל לך?', 'choice', true, 1, true, '', ARRAY['מאוד', 'די', 'קצת', 'בכלל לא'], NULL, ARRAY[]::TEXT[], false, 'survey'),
  ('survey_default_2', 'איך היה המדריך?', 'choice', true, 2, true, '', ARRAY['מצוין', 'טוב', 'בינוני', 'לא טוב'], NULL, ARRAY[]::TEXT[], false, 'survey'),
  ('survey_default_3', 'מה הכי עזר לך היום?', 'long', false, 3, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], false, 'survey'),
  ('survey_default_4', 'מה היית משפר?', 'long', false, 4, true, '', ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], false, 'survey');
