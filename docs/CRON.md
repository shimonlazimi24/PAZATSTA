# How to use Cron (scheduled jobs) — 100% free

Cron = something calls your app’s URL on a schedule (e.g. every day or every week). **All options below are free; no payment required.**

---

## 1. Set the secret (once)

In your `.env` and in your hosting (e.g. Vercel) environment variables, add:

```env
CRON_SECRET="some-long-random-string-only-you-know"
```

Use any long random string (e.g. 32+ characters). This stops strangers from calling your cron URLs.

---

## 2. Your two cron URLs

| What it does | Full URL | Run |
|--------------|----------|-----|
| **Follow-up reminder** (teacher reminder on student screening date) | `https://YOUR-SITE.com/api/cron/follow-up` | **Once per day** |
| **Weekly hours** (hours summary to admin for payment) | `https://YOUR-SITE.com/api/cron/weekly-hours` | **Once per week** |

Every request must send this header:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

---

## 3. Free way to run them: cron-job.org (no credit card)

**cron-job.org** is free and does not require payment.

### Step 1: Create account

1. Go to **https://cron-job.org**
2. Sign up (free).
3. Confirm your email if asked.

### Step 2: First job — follow-up (daily)

1. Click **“Create cronjob”**.
2. **Title:** e.g. `Paza follow-up`.
3. **URL:**  
   `https://YOUR-DEPLOYED-SITE.com/api/cron/follow-up`  
   (Replace with your real app URL, e.g. from Vercel/Netlify.)
4. **Schedule:**  
   - Choose “Every day” and set the time you want (e.g. 8:00).
5. **Request headers** (important):  
   - Click “Add header” or “Advanced” → Headers.  
   - Name: `Authorization`  
   - Value: `Bearer YOUR_CRON_SECRET`  
   (Use the same value as in your `.env`.)
6. Save the cronjob.

### Step 3: Second job — weekly hours

1. Click **“Create cronjob”** again.
2. **Title:** e.g. `Paza weekly hours`.
3. **URL:**  
   `https://YOUR-DEPLOYED-SITE.com/api/cron/weekly-hours`
4. **Schedule:**  
   - “Every week” → pick a day (e.g. Monday) and time (e.g. 9:00).
5. **Request headers:**  
   - Same as above: `Authorization` = `Bearer YOUR_CRON_SECRET`
6. Save.

Done. Both jobs will run on schedule at no cost.

---

## 4. Alternative free option: Vercel Cron (if you host on Vercel)

If you deploy on **Vercel**, cron is included on the **free plan**.

1. This repo already has a `vercel.json` with the cron schedule.
2. In Vercel: your project → **Settings** → **Environment Variables** → add `CRON_SECRET` (same value as in `.env`).
3. Redeploy. Vercel will call the two URLs automatically (no cron-job.org needed).

---

## 5. Test that it works

With your app running (e.g. `npm run dev` or your live URL), run in a terminal:

```bash
curl -H "Authorization: Bearer your-cron-secret-from-env" "http://localhost:3000/api/cron/follow-up"
```

Or use your live URL instead of `http://localhost:3000`.  
If you see JSON with `"ok": true`, the secret and endpoint are correct.

---

## Summary (free only)

1. Set **CRON_SECRET** in `.env` and on your host.
2. Use **cron-job.org** (free): create 2 cronjobs with your two URLs and the `Authorization: Bearer YOUR_CRON_SECRET` header — one daily, one weekly.
3. Or, if you use **Vercel**, add CRON_SECRET and deploy; the built-in cron runs for free.
