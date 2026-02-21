# Lesson Scheduling Platform – Deliverables

Minimal production-ready lesson scheduling (Next.js 14+ App Router, Prisma, PostgreSQL, Tailwind, Resend, Email OTP, role-based routing, Hebrew RTL).

---

## Folder structure (relevant)

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx              # Single login: 3 modes (student / teacher / admin)
│   ├── verify/
│   │   └── page.tsx              # OTP verification
│   ├── student/
│   │   ├── layout.tsx            # Auth + role check
│   │   ├── page.tsx              # Student home (upcoming + past lessons)
│   │   └── book/
│   │       └── page.tsx          # Booking: teacher → slot → confirm
│   ├── teacher/
│   │   ├── layout.tsx            # Auth + role check
│   │   ├── page.tsx              # Teacher dashboard
│   │   ├── availability/
│   │   │   └── page.tsx          # Add/delete availability, "המשך לדשבורד"
│   │   └── lesson/[id]/
│   │       └── report/
│   │           └── page.tsx      # דוח שיעור (form or read-only)
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx              # Define teacher, "שלח סיכום למייל"
│   └── api/
│       ├── auth/
│       │   ├── request-code/route.ts
│       │   ├── verify-code/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       ├── lessons/
│       │   └── book/route.ts     # Atomic book + delete slot, Hebrew error
│       ├── teacher/
│       │   ├── lessons/route.ts  # GET (upcoming/past)
│       │   ├── lessons/[id]/route.ts
│       │   ├── lessons/[id]/complete/route.ts
│       │   └── availability/route.ts
│       ├── student/
│       │   └── lessons/route.ts
│       ├── teachers/route.ts
│       ├── teachers/[id]/availability/route.ts
│       └── admin/
│           ├── define-teacher/route.ts
│           └── send-summary/route.ts
├── components/
│   ├── admin/DefineTeacherForm.tsx, SendSummaryButton.tsx
│   ├── student/StudentDashboardContent.tsx
│   ├── teacher/TeacherHomeLessons.tsx, TeacherDashboard.tsx, TeacherDashboardContent.tsx
│   ├── TeacherAvailability.tsx
│   ├── layout/AppShell.tsx, Sidebar.tsx
│   └── design/BackLink.tsx, Button.tsx, ...
├── lib/
│   ├── auth.ts         # Session, cookies, getUserFromSession
│   ├── otp.ts          # createOTP, hashOTP, verifyOTP
│   ├── email.ts        # sendLoginCode, sendBookingConfirmation, sendAdminSummary, ...
│   ├── admin.ts        # canAccessAdmin, ADMIN_TEACHER_EMAIL
│   └── db.ts           # prisma
├── middleware.ts       # Protect /student, /teacher, /admin; redirect to /login
└── types.ts
prisma/
└── schema.prisma      # User, Availability, Lesson, LessonSummary, LoginCode, Session, ...
```

---

## Prisma schema (summary)

- **User**: id, email (unique), role (admin | teacher | parent | student), name?, phone?, createdAt
- **Availability**: id, teacherId, date, startTime, endTime, isAvailable, createdAt
- **Lesson**: id, teacherId, studentId, date, startTime, endTime, status (scheduled | completed | canceled), **reportCompleted** (default false), questionFromStudent?, createdAt
- **LessonSummary**: id, lessonId (unique), summaryText, homeworkText, pdfUrl?, createdAt
- **LoginCode**: id, email, codeHash, expiresAt (10 min), attempts (max 5), createdAt
- **Session**: id, userId, expiresAt (14 days), createdAt

After adding `reportCompleted` run:

```bash
npx prisma db push
# or
npx prisma migrate dev --name add_report_completed
```

---

## Env vars

| Variable         | Required | Description |
|------------------|----------|-------------|
| `DATABASE_URL`   | Yes      | PostgreSQL connection string |
| `RESEND_API_KEY` | Yes      | Resend API key for sending email |
| `COOKIE_SECRET`  | Yes      | Min 32 characters; used for signing session cookie and OTP hash salt |
| `APP_URL`        | No       | Base URL of the app (e.g. for links in emails) |
| `RESEND_FROM`    | No       | From address (default: onboarding@resend.dev) |

Example `.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/paza"
RESEND_API_KEY="re_xxxx"
COOKIE_SECRET="your-secret-at-least-32-chars-long"
APP_URL="http://localhost:3000"
RESEND_FROM="noreply@yourdomain.com"
```

---

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set the variables above.
3. Database: `npx prisma db push` (or `prisma migrate dev`).
4. (Optional) Seed: `npx prisma db seed` if you have a seed script.
5. Run: `npm run dev`.

---

## Flows (short)

- **Login**: `/login` → choose התחבר כתלמיד / כמורה / כאדמין → email → send code → `/verify` → redirect: student → `/student/book`, teacher → `/teacher/availability`, admin → `/admin`.
- **Student**: Home `/student` (upcoming + past, קבע שיעור נוסף). Book `/student/book`: choose teacher → slot → confirm (atomic; on conflict: "הזמן נתפס, בחר זמן אחר"). Emails to teacher + student.
- **Teacher**: First `/teacher/availability` (add/delete slots, המשך לדשבורד). Dashboard `/teacher`: upcoming + past; past: badge חסר דוח / דוח הושלם, button מלא דוח שיעור → `/teacher/lesson/[id]/report`. Report: סיכום השיעור, משימות לתרגול → submit → LessonSummary + status completed + reportCompleted true; then read-only.
- **Admin**: Define teacher by email (create or set role=teacher). Button "שלח סיכום למייל" → email to admin with completed lessons (default last 7 days).

---

## Security

- OTP hashed (HMAC-SHA256 with COOKIE_SECRET); max 5 attempts; 10 min expiry.
- Session: HttpOnly, SameSite=Lax, Secure in production.
- Logout: delete session and clear cookie.
- Middleware: unauthenticated → `/login`. Role checks in layouts: student only `/student`, teacher only `/teacher`, admin only `/admin`.
