# תיקון האתר ב-Netlify – צעדים חובה

## 1. Netlify UI – הגדרות Build

עבור ל: **Site configuration** → **Build & deploy** → **Build settings** → **Edit settings**

- **Publish directory:** השאר **ריק** (לא להגדיר) – ה-plugin מנהל את זה
- **Base directory:** השאר **ריק**
- **Functions directory:** השאר **ריק**
- **Build command:** `npx prisma migrate deploy && npm run build` (או השאר ל-netlify.toml)

## 2. נקה cache ופרוס מחדש

**זה הצעד הכי חשוב.**

1. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
2. לחץ על "Clear cache and deploy site" (לא רק "Deploy site")

## 3. אחרי ה-deploy – בדיקה

1. פתח את האתר ב-incognito (או Cmd+Shift+R לרענון קשיח)
2. בדוק ש-`/verify` ו-`/login` עובדים עם עיצוב
3. אם יש בעיה – בדוק ב-console: אם יש שגיאת MIME על `/_next/static/css/...` – חזור ל-step 2

## 4. מה היה מתוקן בקוד

- הוסר `@netlify/plugin-nextjs` מ-package.json – הוספתו ל־package.json גרמה ל-double-loading ו־404 על assets
- ה-plugin נטען רק דרך netlify.toml: `[[plugins]] package = "@netlify/plugin-nextjs"`
