# Paza Lessons — Guitar Lesson Business MVP

Two-sided platform: **Teacher portal** (availability, complete lessons, PDF summaries) and **Student/Parent portal** (browse teachers, book slots, view past lessons, download PDFs).

## Stack

- Next.js 14 App Router, TypeScript, TailwindCSS
- Prisma + PostgreSQL
- Resend (email), Puppeteer (HTML → PDF)
- Auth: Email OTP, HttpOnly session cookie, middleware role routing

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
   - Optional: `RESEND_FROM`, `APP_URL`, `STORAGE_PATH`, `CRON_SECRET`

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

- **Admin:** Seed creates `shachar.cygler@gmail.com`. Request code → verify → you land on `/admin`.
- **Teacher (via invite):** As admin, POST `/api/admin/invite` with `{ "email": "teacher@test.com", "role": "teacher" }`. Then log in as that email → redirect to `/teacher`.
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
