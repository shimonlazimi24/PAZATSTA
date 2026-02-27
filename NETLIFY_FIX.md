# תיקון האתר ב-Netlify – צעדים חובה

## אם ה-build נכשל עם "publish directory cannot be same as base"

ב-Netlify UI: **Site configuration** → **Build & deploy** → **Build settings** → **Edit settings**

- **Publish directory:** השאר **ריק לגמרי** (מחק כל ערך אם יש)
- **Base directory:** נסה להגדיר `./` או השאר ריק
- **Functions directory:** השאר ריק

אם עדיין נכשל – נסה להגדיר **Base directory** ל-`src` או לתיקייה אחרת (רק אם הפרויקט במבנה monorepo).

## אחרי שהגדרות נכונות

### 1. נקה cache ופרוס מחדש

**זה הצעד הכי חשוב.**

**Deploys** → **Trigger deploy** → **Clear cache and deploy site**

(לא רק "Deploy site" – חייב "Clear cache and deploy site")

### 2. בדיקה בדפדפן

1. פתח את האתר ב-**חלון פרטי (Incognito)** או Cmd+Shift+R לרענון קשיח
2. בדוק ש-`/verify` ו-`/login` נטענים עם עיצוב
3. אם יש שגיאת MIME ב-console – חזור ל-step 1

## מה תוקן בקוד

- **אין `publish` ב-netlify.toml** – ה-plugin מנהל את הפלט
- **`rm -rf .next`** בתחילת build – מונע assets ישנים
- **`build:clean`** – `npm run build:clean` לניקוי מקומי לפני build
- **NETLIFY_NEXT_PLUGIN_SKIP=false** – מוודא שה-plugin רץ
- **Redirect** `/next/*` → `/_next/*` – תיקון לכתובות שגויות
