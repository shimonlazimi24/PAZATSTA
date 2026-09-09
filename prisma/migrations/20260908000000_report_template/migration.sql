-- Move the lesson-summary tip library and the report field wording out of the
-- codebase and into tables the admin can manage.
--
-- Tip.slug carries the identifiers already stored in LessonSummary.tips (e.g.
-- "dafr-kvant-klali"), so historical summaries keep resolving after this runs.
--
-- Tip.topics holds NORMALIZED topic keys (see src/lib/topic-key.ts), not display
-- labels. The same lesson type is spelled several ways across the app's
-- vocabularies — "דפ״ר" with gershayim, with an ASCII quote, and with none at
-- all — and matching on the raw label would silently drop tips.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tip" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL DEFAULT '',
    "topics" TEXT[] DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tip_slug_key" ON "Tip"("slug");
CREATE INDEX IF NOT EXISTS "Tip_isArchived_sortOrder_idx" ON "Tip"("isArchived", "sortOrder");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportFieldConfig" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT NOT NULL DEFAULT '',
    "placeholder" TEXT NOT NULL DEFAULT '',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportFieldConfig_pkey" PRIMARY KEY ("key")
);

-- AlterTable
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "tipsCustom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "tipsSnapshot" TEXT NOT NULL DEFAULT '';

-- Seed the field wording with exactly what the teacher's form renders today, so
-- the form is unchanged after deploy. These govern the form only — the PDF keeps
-- its own headings, because PDFs re-render from the database on every view and a
-- renamed label would otherwise rewrite reports parents already received.
INSERT INTO "ReportFieldConfig" ("key", "label", "helpText", "placeholder", "isRequired", "updatedAt") VALUES
  ('summaryText',     'סיכום כללי',    '', 'סיכום כללי של השיעור',  true,  CURRENT_TIMESTAMP),
  ('pointsToKeep',    'נקודות לשימור', '', 'מה עבד טוב, לשמור עליו', true,  CURRENT_TIMESTAMP),
  ('pointsToImprove', 'נקודות לשיפור', '', 'מה לשפר',                true,  CURRENT_TIMESTAMP),
  ('tips',            'טיפים',         '', '',                       false, CURRENT_TIMESTAMP),
  ('recommendations', 'המלצות להמשך',  '', 'המלצות לשיעורים הבאים',  true,  CURRENT_TIMESTAMP),
  ('homeworkText',    'משימות לתרגול', '', 'תרגול והכנה לשיעור הבא', false, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed the tip library from the catalogue that lived in src/data/tips.ts.
-- Slugs are preserved verbatim. sortOrder follows the flattened TIP_GROUPS order,
-- which is the order getTipsDisplayText renders in — the backfill below depends
-- on that being exact. Topic keys reproduce what the old regex mapping selected,
-- including its quirks: the deploy is behaviour-neutral, and the admin can
-- correct the scoping from the new screen afterwards.

-- צו ראשון - דפר (3 topic keys)
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-kvant-klali$tip$, $tip$dafr-kvant-klali$tip$, $tip$חשיבה כמותית - כללי$tip$, $tip$חשיבה כמותית - כללי:
דרך לפתרון של שאלות נעשה על ידי השלבים הבאים:
- קוראים את השאלה
- מבינים מה סוג השאלה
- בודקים מה שואלים - מה צריך למצוא
- מבינים מהם הנתונים הברורים ומהם הנתונים נסתרים (שמסיקים מתוך הנתונים הברורים)
- משתמשים בשיטות פתרון
- שימוש בשיטת האלימינציה ככלל מנחה$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 10, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-kvant-hastabrut$tip$, $tip$dafr-kvant-hastabrut$tip$, $tip$חשיבה כמותית - הסתברות$tip$, $tip$חשיבה כמותית - הסתברות:
- יש לנו רצוי ומצוי כאשר רצוי זה מה שאנחנו רוצים למצוא ומבקשים בשאלה ומצוי זה כל מה שנתון לנו. רצוי חלקי מצוי זה הפתרון ודרך העבודה
- בסידורים אנחנו פשוט רואים מה מספר האפשרויות ואנחנו עושים כפל לאחור. לדוגמה אם יש לנו סידור של 4 עפרונות (כמו בשאלה שראינו) עושים 4 * 3 * 2 * 1 = התוצאה$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 20, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-kvant-geometria$tip$, $tip$dafr-kvant-geometria$tip$, $tip$חשיבה כמותית - גאומטריה$tip$, $tip$חשיבה כמותית - גאומטריה:
- שלשות פיתגוריות שצריך לזכור: 3-4-5, 6-8-10, 5-12-13
- יש לנו הרבה צורות כמו משולש, משולש ישר זווית, ריבוע, מלבן, קוביה ותיבה
- חישוב נפח קוביה זה הצלע בשלישית
- חישוב בסיס הקוביה זה פשוט לחשב שטח של ריבוע
- חישוב נפח תיבה זה אורך כפול רוחב כפול גובה
- חישוב בסיס התיבה זה פשוט לחשב שטח מלבן$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 30, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-analogiot-miluliot$tip$, $tip$dafr-analogiot-miluliot$tip$, $tip$אנלוגיות מילוליות$tip$, $tip$אנלוגיות מילוליות
- להתחיל בהגדרה של כל מילה בנפרד ואז למצוא את הקשר ביניהם
- אם אנחנו לא מכירים את אחת המילים בשאלה עוברים לבדיקת תשובות
- אם אנחנו לא מכירים את אחת המילים בתשובות עובדים מסודר עם מה שכן מכירים
- לא להטות מילים לצורות הגייה שונות
- לבדוק אם המילים הן שמות עצם, פועל, תואר או ציווי
- לשים לב מאיזה כיוון אנחנו בודקים את הקשר ולוודא שהקשר מתקיים גם בתשובות מאותו כיוון
- סוגי תבניות באנלוגיות: מילים נרדפות, מילים מנוגדות/הפוכות, ציווי ושם פעולה, משהו מתוך משהו (סיבה ותוצאה), העצמה/הפחתה
- לזכור שיש סוגי קשרים רגילים ואנחנו רוצים להגדיר לעצמנו את סוג הקשר של כל שאלה ואז לבדוק את התשובות בהתאם
- המבחן צובר ניקוד! כלומר גם אם את לא יודעת ומנחשת לא ירד לך ניקוד אלא את יכולה רק לזכות בעוד ניקוד, חשוב לנחש וחשוב עוד יותר לעשות את זה בזמן הנתון
- אם יש לך שאלה שאת לא מכירה את המילים בשאלה ולא בתשובה אז לא לבזבז את הזמן ולנסות להבין, לנחש ולהמשיך הלאה! תזכרי שדיברנו על הכוח שלך לאורך זמן וצריך לנהל אותו נכון
- ללמוד עוד מילים יעזור לך במבחן
- חלוקה לזמנים: 10 שניות ראשונות בדיקה ראשונית, 10 שניות הבאות בהתאם לידע, 10 שניות אחרונות של פסילת תשובות וקביעת התשובה הנכונה$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 40, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-havana-horaot$tip$, $tip$dafr-havana-horaot$tip$, $tip$הבנת הוראות$tip$, $tip$הבנת הוראות
- לכתוב לפני המבחן את השורות של האותיות, הערך הגימטרי ואת מיקומן בסדר האלפבית כדי להתחיל את המבחן בצורה מדויקת ומוכנה
- בשאלות של תנאי לא צריך לקרוא את כל השאלה, רק לקרוא את מה שרלוונטי בהתאם לתנאים$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 50, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$dafr-analogiot-tzuraniot$tip$, $tip$dafr-analogiot-tzuraniot$tip$, $tip$אנלוגיות צורניות$tip$, $tip$אנלוגיות צורניות
סוגי התבניות שיש הפרק הן:
- סיבוב צורה - עם או נגד כיוון השעון, ובכמה מעלות, והאם זה כל הצורה או רק חלקה
- שינוי צבע - לאיזה כיוון הצבעים זזים
- הגדלה/הפחתה - לרוב מגיע בצורות הנדסיות כמו משולשים/ריבועים/מחומשים וכו
- חיתוך צורה - צורה שנמצאת בתוך צורה גדולה יותר שמכילה מספר אלמנטים
- מראה אנכית - שינוי של הצורה מצד אחד לצד שני. למעלה למטה ולהפך
- מראה אופקית - שינוי של הצורה מצד אחד לצד שני. משמאל לימין ולהפך$tip$, $tip$צו ראשון - דפר$tip$, '{"צו ראשון - מבחן דפר","דפר משטרה","מבחן דפר חוזר"}', 60, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- יום המאה (3 topic keys)
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$maha-dinamika$tip$, $tip$maha-dinamika$tip$, $tip$יום המא״ה - דינמיקה קבוצתית$tip$, $tip$יום המא״ה - דינמיקה קבוצתית:
לא להיות ״יס מן״ - להביע דעה ולהציג את מה שחשוב לך כל הזמן
לא להיות ״מנהיג שלילי״ - להכיל את האחרים לשמוע דעות ולא לקטוע/לבטל או להחליט לאחרים מה הם חושבים ורוצים
להיות עם סטופר/טיימר לניהול הזמן הקבוצתי ולהיות שעון דובר
לכתוב את כל ההצעות של כולם כדי לשלוט הרעיונות ובניהול הקבוצה
לזכור את אפקט הראשון, אפקט האחרון ואפקט העדר
לנסות להוביל ולא להתבייש להגיד את דעתנו תוך כדי הדיון, לשתף חברים נוספים וכאלו שפחות מורגשים כדי להוסיף לעצמך נקודות על יכולת שליטה, פיקוד, עבודת צוות וניהול.
לנהל את הדיון ממקום לא של אגו אלא של הגעה לפתרון והצלחת המשימה
תמדוד זמנים לאורך כל התחנה 
תציין דברים שאתה עושה ואל תתבייש להגיד אותם בקול
תזכור את אפקט הראשונים, האחרונים והעדר
תכתוב מה אנשים אחרים אומרים בהתאם למשימה זה יעזור לך להיות מסודר ולשפר את יכולת השכנוע שלך
לנסות להוביל ולא להתבייש להגיד את דעתנו תוך כדי הדיון, לשתף חברים נוספים וכאלו שפחות מורגשים כדי להוסיף לעצמך נקודות על יכולת שליטה, פיקוד, עבודת צוות וניהול.$tip$, $tip$יום המאה$tip$, '{"יום המאה - תחנות קבוצתיות","יום המאה - מבחנים פסיכוטכניים","יום המאה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)"}', 70, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$maha-hadracha$tip$, $tip$maha-hadracha$tip$, $tip$יום המא״ה תחנת הדרכה$tip$, $tip$יום המא״ה תחנת הדרכה:
להתחיל בשאלה מעניינת ולהשתמש בהרמות יד כדי לייצר עניין!
לבנות את המצגת לפי השלבים:
פתיחה - לפתוח בהצגה עצמית קצרה ושאלה מעניינת שתתחיל את הנושא (עד 30 שניות)
תוכן - לדבר על הדברים שחשובים לך ומעניינים אותך ושיש להם קשר גם אל ההפעלה כדי לייצר את הקישוריות והמעבר החלק בין הנושאים של ההדרכה.
הפעלה - החלק החשוב ביותר בהדרכה שצריך להיות אקטיבים ולגרום לקהל להשתתף ולהעביר להם את המשחק הנתון בתוך המצגת בצורה קלילה וכיפית. 
סיכום - משפט קצר שמסכם הכל וזמן לשאלות (לא יותר מ- 20-25 שניות).
לקשר את ההפעלה לתוכן כדי שיהיה לך מה לשאול בצורה טובה וברורה
לא להראות שנתקעת גם אם זה קרה, לחייך ולהמשיך לנקודה הבאה.$tip$, $tip$יום המאה$tip$, '{"יום המאה - תחנות קבוצתיות","יום המאה - מבחנים פסיכוטכניים","יום המאה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)"}', 80, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$maha-simulazia$tip$, $tip$maha-simulazia$tip$, $tip$יום המא״ה תחנת סימולציה אישית$tip$, $tip$יום המא״ה תחנת סימולציה אישית:
המבנה של הפתרון לסימולציה קשה:
לשאול שאלות מקדימות
לשנות נקודת כיוון והתבוננות
להמציא המצאות נוספות
להגיש פתרון יצירתי
לא להשתמש במילים כמו ״אי אפשר״, ״אסור״, לא מוחלט. עדיף להשתמש במילות קישור כמו:
מאתגר/ מורכב/ מסובך/ קשה/ בעייתי
לא לשכוח שזה דיאלוג שאתם מדברים ומקשיבים. המטרה לתת אוזן קשבת ולמצוא דרך לתת תחושת עזרה והדדיות.
חלוקה של השלבים בפתרון של סימולציה המכילה:
לשאול הרבה שאלות
להמציא המצאות
לתת פתרון יצירתי
לא לשכוח שמדובר כאן על מסירה של הודעה והמטרה היא להיות אכפתיים/אמפתיים/מכילים ורגישים. זה יותר מונולוג שלך ופחות שיחה פתוחה.$tip$, $tip$יום המאה$tip$, '{"יום המאה - תחנות קבוצתיות","יום המאה - מבחנים פסיכוטכניים","יום המאה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)"}', 90, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$maha-psicho$tip$, $tip$maha-psicho$tip$, $tip$יום המא״ה - מבחנים פסיכוטכניים$tip$, $tip$יום המא״ה - מבחנים פסיכוטכניים:
תרשימי זרימה - לזכור את סוגי השאלות ולראות לאן החצים מתקדמים כדי לדעת מה התוצאה או מה הסיבה
עיבוד מילולי - לא צריך לקרוא את כל הפסקאות בהתחלה, חשוב כן להבין מה הפרמטרים בכל נושא כדי לדעת איך להתייחס ורק לפי השאלות להשתמש בשיטת האלימינציה
הבנה טכנית - בעזרת קריאת הטבלאות ומציאת השאלות הנכונות אפשר לפתור את רוב השאלות במהירות וללא בעיה + אין צורך לקרוא את ההסבר המקדים כדי לא להתבלבל או לבזבז אנרגיה.$tip$, $tip$יום המאה$tip$, '{"יום המאה - תחנות קבוצתיות","יום המאה - מבחנים פסיכוטכניים","יום המאה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)"}', 100, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- חיל המודיעין (7 topic keys)
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$haman-klalim-shivutzim$tip$, $tip$haman-klalim-shivutzim$tip$, $tip$כלל חמ״ן כללים ושיבוצים$tip$, $tip$כלל חמ״ן כללים ושיבוצים
בשאלות של כללים ושיבוצים (לוגיקה) נשים לב מה שואלים אותנו אם כתוב ״בהכרח״ ״בלבד״ או ״רק״ נדע שזה מוחלט, לעומת מילים כמו ״יכול״ ייתכן״ או ״אפשרי״. הסמנטיקה פה מאוד משמעותית כמו שראינו$tip$, $tip$חיל המודיעין$tip$, '{"כלל חמן - מבחנים פסיכוטכניים (מיון ראשון)","כלל חמן - ראיון אישי/מקצועי","כלל חמן - מבחני מצב (דינמיקה קבוצתית)","שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)","שחקים/חבצלות - ראיון אישי/מקצועי","שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)","סייבר - מיון ראשוני (מבחנים פסיכוטכניים)"}', 110, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$haman-sedorot$tip$, $tip$haman-sedorot$tip$, $tip$כלל חמ״ן סדרות ספרתיות$tip$, $tip$כלל חמ״ן סדרות ספרתיות
צריך לזכור שיש סדרה של 4,5 ספרות - מדובר על חוקיות אחת. אם יש 5,6 ספרות - מדובר על 2 תתי סדרות עם חוקיות שונה לכל תת סדרה. נזכור שיכול להיות מצב של חיבור, חיסור, כפל, חילוק, שורש, חזקה או עצרת. צריך להגיע עם ראש פתוח לכל הנושא ואם לא יודע אז לנחש בצורה מושכלת.
בשאלות של הסקת מסקנות (וגם כללים ושיבוצים) נשים לב מה שואלים אותנו אם כתוב ״בהכרח״ ״בלבד״ או ״רק״ נדע שזה מוחלט, לעומת מילים כמו ״יכול״ ייתכן״ או ״אפשרי״. הסמנטיקה פה מאוד משמעותית כמו שראינו.$tip$, $tip$חיל המודיעין$tip$, '{"כלל חמן - מבחנים פסיכוטכניים (מיון ראשון)","כלל חמן - ראיון אישי/מקצועי","כלל חמן - מבחני מצב (דינמיקה קבוצתית)","שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)","שחקים/חבצלות - ראיון אישי/מקצועי","שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)","סייבר - מיון ראשוני (מבחנים פסיכוטכניים)"}', 120, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$haman-haskata$tip$, $tip$haman-haskata$tip$, $tip$כלל חמ״ן הסקת מסקנות$tip$, $tip$כלל חמ״ן הסקת מסקנות
לקרוא את השאלות עד הסוף בהסקת מסקנות ובכללים ושיבוצים (לוגיקה) ואז לשרטט ולהבין בדיוק מה אפשרי ומה פחות בהתאם$tip$, $tip$חיל המודיעין$tip$, '{"כלל חמן - מבחנים פסיכוטכניים (מיון ראשון)","כלל חמן - ראיון אישי/מקצועי","כלל חמן - מבחני מצב (דינמיקה קבוצתית)","שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)","שחקים/חבצלות - ראיון אישי/מקצועי","שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)","סייבר - מיון ראשוני (מבחנים פסיכוטכניים)"}', 130, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$haman-analogiot$tip$, $tip$haman-analogiot$tip$, $tip$כלל חמ״ן אנלוגיות מילוליות$tip$, $tip$כלל חמ״ן אנלוגיות מילוליות
להתחיל בהגדרה של כל מילה בנפרד ואז למצוא את הקשר ביניהם
אם אנחנו לא מכירים את אחת המילים בשאלה עוברים לבדיקת תשובות
אם אנחנו לא מכירים את אחת המילים בתשובות עובדים מסודר עם מה שכן מכירים
לא להטות מילים לצורות הגייה שונות
לבדוק אם המילים הן שמות עצם, פועל, תואר או ציווי
לשים לב מאיזה כיוון אנחנו בודקים את הקשר ולוודא שהקשר מתקיים גם בתשובות מאותו כיוון$tip$, $tip$חיל המודיעין$tip$, '{"כלל חמן - מבחנים פסיכוטכניים (מיון ראשון)","כלל חמן - ראיון אישי/מקצועי","כלל חמן - מבחני מצב (דינמיקה קבוצתית)","שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)","שחקים/חבצלות - ראיון אישי/מקצועי","שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)","סייבר - מיון ראשוני (מבחנים פסיכוטכניים)"}', 140, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$haman-klali$tip$, $tip$haman-klali$tip$, $tip$כלל חמ״ן כללי$tip$, $tip$כלל חמ״ן כללי
לקחת הפסקות בין הפרקים ולנצל את כל היום במלואו למלא את המבחן בנחת וברוגע.$tip$, $tip$חיל המודיעין$tip$, '{"כלל חמן - מבחנים פסיכוטכניים (מיון ראשון)","כלל חמן - ראיון אישי/מקצועי","כלל חמן - מבחני מצב (דינמיקה קבוצתית)","שחקים/חבצלות - מבחנים פסיכוטכניים (מיון ראשון)","שחקים/חבצלות - ראיון אישי/מקצועי","שחקים/חבצלות - מבחני מצב (דינמיקה קבוצתית)","סייבר - מיון ראשוני (מבחנים פסיכוטכניים)"}', 150, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- מיונים לטיס (2 topic keys)
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$yirpa-kubia$tip$, $tip$yirpa-kubia$tip$, $tip$ירפ״א א׳ - מבחן הקוביה$tip$, $tip$ירפ״א א׳ - מבחן הקוביה
לזכור את החוקים הבאים:
יש 6 פאות
יש מרכז 1 לכל פאה (מ׳)
יש 4 פאות (פ׳) ו- 4 צדדים (צ׳)
כל פאה מקיימת קו דימוני ישר שהולך לפאה הנגדית אליה! 
החוקים הברורים של הקוביה הם:
אם יש לנו מ׳ ומ׳ הם תמיד יפגשו באמצע
אם יש לנו את אותם האותיות ב-2 נקודות, הן לעולם לא יפגשו
אם יש לנו את אותם הפאות (פ) ב-2 נקודות, הן יפגשו או בהתחלה (אם הן צמודות) או בסוף, או לא יפגשו בכלל
פאה ופאה או צד וצד יכולים להיפגש רק ובלבד אם הן באותיות נגדיות ונמצאות בהכרח באותו המיקום ביחס לפאה הנגדית.$tip$, $tip$מיונים לטיס$tip$, '{"קורס טיס - ירפא א (מבחנים פסיכוטכניים)","קורס טיס - ירפא ב (ראיון פסיכולוג)"}', 160, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$yirpa-reiya$tip$, $tip$yirpa-reiya$tip$, $tip$ירפ״א א׳ - ראייה מרחבית של המטוסים$tip$, $tip$ירפ״א א׳ - ראייה מרחבית של המטוסים
אנחנו רוצים להסתכל על הכיוון של הפנייה של המטוס - אם הצד השמאלי גבוה יותר המטוס פונה שמאלה והפוך
אנחנו רוצים לבחון את הקרקע ולהחליט בהתאם לסוג השאלה מה אנחנו בוחנים. אם זה מהקרקע לכיוון המטוס לא לשכוח שיש השתקפות מראה והקרקע נראת הפוך
אם אנחנו צריכים לקבוע איך נראה המטוס מהקרקע אחרי שראינו איך התמונה מהמטוס צריך לזכור שהפנייה היא אותה הזווית במטוס מבפנים בתא הטייס וגם בהסתכלות עליו מהצד השני.$tip$, $tip$מיונים לטיס$tip$, '{"קורס טיס - ירפא א (מבחנים פסיכוטכניים)","קורס טיס - ירפא ב (ראיון פסיכולוג)"}', 170, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- כלליים (general - offered for every lesson type)
INSERT INTO "Tip" ("id", "slug", "label", "text", "groupLabel", "topics", "sortOrder", "isArchived", "updatedAt")
VALUES ('seed-tip-' || $tip$klalim$tip$, $tip$klalim$tip$, $tip$הפסקות וניהול זמן$tip$, $tip$כלליים:
- לקחת הפסקות בין הפרקים ולנצל את כל היום במלואו למלא את המבחן בנחת וברוגע$tip$, $tip$כלליים$tip$, '{}', 180, false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Freeze every report that already exists.
--
-- Without this, the tip library becomes editable while historical summaries still
-- store only slugs — so the first admin edit would rewrite the PDF behind every
-- link already sitting in a parent's inbox. The snapshot must reproduce today's
-- rendering exactly: full tip texts joined by a blank line, "---", and a blank
-- line, ordered by sortOrder rather than by the order the teacher ticked them.
--
-- Rows whose "tips" holds legacy free text match no slug, so string_agg yields
-- NULL and the COALESCE keeps their original text untouched.
UPDATE "LessonSummary" s
SET "tipsSnapshot" = COALESCE(
  NULLIF((
    SELECT string_agg(t."text", E'\n\n---\n\n' ORDER BY t."sortOrder")
    FROM "Tip" t
    WHERE t."slug" = ANY(string_to_array(s."tips", ','))
  ), ''),
  s."tips"
)
WHERE s."tipsSnapshot" = '';
