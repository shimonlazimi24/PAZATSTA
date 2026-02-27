# מעבר מ-Netlify ל-Vercel

Netlify + Next.js גורמים לבעיות חוזרות (404 על assets, MIME errors). Vercel הוא הפלטפורמה המומלצת ל-Next.js ועובד out-of-the-box.

## צעדים (כ־10 דקות)

### 1. צור פרויקט ב-Vercel

1. היכנס ל-[vercel.com](https://vercel.com)
2. **Add New** → **Project**
3. ייבא את ה-repo מ-GitHub (אותו repo כמו Netlify)

### 2. הגדרות Build

- **Framework Preset:** Next.js (זיהוי אוטומטי)
- **Build Command:** `npm run build:vercel` (או `npx prisma migrate deploy && npm run build`)
- **Output Directory:** השאר ריק (ברירת מחדל)
- **Install Command:** `npm install`

### 3. משתני סביבה

העתק מ-Netlify (Site configuration → Environment variables) או הוסף ידנית:

| Name | Value |
|------|-------|
| `DATABASE_URL` | connection string מ-Supabase |
| `DIRECT_URL` | (אם יש ב-Netlify) |
| `COOKIE_SECRET` | מפתח סודי (32+ תווים) |
| `RESEND_API_KEY` | מפתח Resend |
| `RESEND_FROM` | כתובת השליחה (או `onboarding@resend.dev`) |
| `APP_URL` | `https://pazatsta-schedule.vercel.app` (או הדומיין שלך) |

### 4. Deploy

לחץ **Deploy**. Vercel יריץ build ויפרסם את האתר.

### 5. דומיין מותאם (אופציונלי)

אם יש לך `pazatsta-schedule.com`:
- Vercel → Project → **Settings** → **Domains**
- הוסף `pazatsta-schedule.com`
- עדכן את ה-DNS (הוסף CNAME ל-`cname.vercel-dns.com` או השתמש ב-Vercel nameservers)

### 6. Cron jobs

ה-`vercel.json` כבר מכיל את ה-crons. Vercel יריץ אותם אוטומטית.

---

## אחרי המעבר

- כבה או מחק את האתר ב-Netlify
- עדכן `APP_URL` ב-Vercel אם הוספת דומיין מותאם
