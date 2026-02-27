# Paza Lessons — Guitar Lesson Business MVP

Two-sided platform: **Teacher portal** (availability, complete lessons, PDF summaries) and **Student/Parent portal** (browse teachers, book slots, view past lessons, download PDFs).

## Stack

- Next.js 14 App Router, TypeScript, TailwindCSS
- Prisma + PostgreSQL
- Resend (email), Puppeteer (HTML → PDF)
- Auth: Email OTP, HttpOnly session cookie, middleware role routing

## Netlify deploy

### Netlify deploy checklist

The plugin must be loaded **only once** (in `netlify.toml`). Do **not** add it to `package.json`—double-loading breaks `/_next/static/*` (404 + wrong MIME).

**Netlify UI** (Site → Site configuration → Build & deploy → Build settings → Edit settings):

- [ ] **Publish directory** = **Not set** (click the field, clear any value, or leave blank)
- [ ] **Base directory** = `/` or empty
- [ ] **Functions directory** = **Not set**
- [ ] No custom redirects that catch `/_next/*` and rewrite to HTML

### Post-deploy verification

After deploy, verify static assets return 200 with correct content-type:

```bash
# Replace <site> with your Netlify site (e.g. pazatsta-schedule)
# Get a real path from your built .next/static/ or from the page source
curl -I https://<site>.netlify.app/_next/static/css/<hash>.css
```

Expected: `HTTP/2 200` and `Content-Type: text/css`. If you get `text/html` or 404, the plugin is not running correctly or redirects are catching the request.

## Run locally

1. **Install**

   ```bash
   npm install
   ```

2. **Env**

   Copy env and set values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — Postgres connection string (e.g. Supabase or Railway)
   - `RESEND_API_KEY` — Resend API key (for OTP emails)
   - `COOKIE_SECRET` — Random string, at least 32 characters
   - Optional: `RESEND_FROM`, `APP_URL`, `STORAGE_PATH`
   - `CRON_SECRET` — for daily follow-up reminder; call `GET /api/cron/follow-up` with `Authorization: Bearer <CRON_SECRET>` (e.g. Vercel Cron or external scheduler)

3. **Database**

   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

   Seed creates user `shachar.cygler@gmail.com` (admin). Use that email to log in first.

   If you already ran migrations before, run again for new models (TeacherProfile, StudentProfile, Availability, LessonSummary, Lesson changes):

   ```bash
   npx prisma migrate dev --name guitar_mvp
   ```

4. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Go to `/login`.

## How to check

- **Admin:** Seed creates `shachar.cygler@gmail.com`. Click "התחבר כאדמין" or go to `/login/admin` → verify → `/admin`.
- **Student:** Any email can log in as student. Redirect → `/student/welcome` → profile → topics → book → `/student` (home).
- **Teacher (via admin):** As admin, use "הגדרת מורה לפי מייל" to set a user as teacher. Then log in as that email → redirect to `/teacher`.
- **No access:** Use an email that is neither a user nor in `invites` → request code returns “No access, contact admin”.
- **Session:** After login, refresh `/teacher` (or your role page) — still accessible.
- **Role redirect:** As teacher, open `/admin` → redirect to `/teacher`.
- **Logout:** Click Logout → cookie cleared; visiting `/teacher` redirects to `/login`.

## Routes

| Path       | Description              |
| ---------- | ------------------------ |
| `/`        | Redirect to login or role dashboard |
| `/login`   | Enter email, send OTP    |
| `/verify`  | Enter email + 6-digit code |
| `/teacher` | Teacher dashboard        |
| `/parent`  | Parent dashboard         |
| `/student` | Student dashboard        |
| `/admin`   | Admin dashboard          |

## API overview

- Auth: `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `POST /api/auth/logout`
- Admin: `POST /api/admin/invite`, `GET /api/admin/invites`
- Teacher: `GET|POST|DELETE /api/teacher/availability`, `GET /api/teacher/lessons`, `POST /api/teacher/lessons/[id]/complete`
- Public: `GET /api/teachers`, `GET /api/teachers/[id]/availability`
- Book: `POST /api/lessons/book` (student/parent)
- Student: `GET /api/student/lessons`
- Parent: `GET /api/parent/lessons`
- PDF: `GET /api/pdf/[...path]` (serves stored PDFs)
- Cron: `GET /api/cron/follow-up` (set `Authorization: Bearer <CRON_SECRET>`; run daily for 7-day follow-up reminders)
