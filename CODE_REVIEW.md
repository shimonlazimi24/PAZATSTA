# Paza – Code Review Report

**Scope:** Performance, bugs, architecture  
**Date:** Feb 2025

---

## 1. Architecture

### 1.1 Stack & Structure

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router |
| DB | Prisma + PostgreSQL |
| Auth | OTP email → verify → session cookie (HMAC-signed) |
| Email | Resend |
| PDF | @react-pdf/renderer |

- **Layouts:** Role-based (`/admin`, `/teacher`, `/student`) with server-side auth
- **API:** REST under `/api/` with `getUserFromSession()` for auth
- **State:** `useState`/`useEffect` in client components; no global store

### 1.2 Data Flow

```
Auth: OTP request → LoginCode (DB) → email → verify → Session (DB) → cookie
Booking: Topic → teacher → slot → submit → Lesson + delete Availability
Teacher: Lessons list → approve/report → complete → PDF + email
```

### 1.3 Gaps

- No shared request validation (e.g. Zod)
- Mixed API patterns: `apiJson` vs raw `fetch`
- Admin email hardcoded in `src/lib/admin.ts`

---

## 2. Security (High Priority)

### 2.1 PDF endpoint – no authorization

**Severity: HIGH**

**Location:** `src/app/api/pdf/[...path]/route.ts`

**Issue:** Anyone can request lesson PDFs by guessing lesson IDs. No check that the user is teacher, student, or admin for that lesson.

**Example:** `GET /api/pdf/lesson-summaries/lesson-cmm102omf00083bauwoxobu3r.pdf` returns the PDF without auth.

**Fix:** Resolve lesson from path, then verify user is teacher/student/admin for that lesson before serving.

---

### 2.2 Cron endpoint – auth when `CRON_SECRET` unset

**Severity: HIGH**

**Location:** `src/app/api/cron/expire-pending-lessons/route.ts`

**Issue:** If `CRON_SECRET` is not set, `CRON_SECRET && auth !== ...` is false, so the auth check is skipped and anyone can call the cron.

**Fix:** Require `CRON_SECRET` in production and always validate; return 401 when missing or invalid.

---

### 2.3 OTP rate limiting

**Severity: HIGH**

**Location:** `src/app/api/auth/request-code/route.ts`

**Issue:** No rate limiting. OTP requests can be spammed per email (abuse, DoS, cost).

**Fix:** Add per-email and per-IP limits (e.g. 5 requests per 15 minutes).

---

### 2.4 Secrets fallback

**Severity: MEDIUM**

**Location:** `src/lib/auth.ts`, `src/lib/otp.ts`

**Issue:** Uses `"fallback"` / `"fallback-salt-min-32-chars"` when env is missing.

**Fix:** Fail startup if `COOKIE_SECRET` is missing in production.

---

## 3. Bugs & Robustness

### 3.1 Email error handling

**Severity: MEDIUM**

**Location:** `src/lib/email.ts` – `sendBookingConfirmation`, `sendLessonCompleted`

**Issue:** Resend `result.error` is not checked; failures are silent.

**Fix:** Check `result.error`, log, and optionally retry or surface to caller.

---

### 3.2 Email validation in request-code

**Severity: MEDIUM**

**Location:** `src/app/api/auth/request-code/route.ts`

**Issue:** Accepts any non-empty string; no format validation.

**Fix:** Validate email format (e.g. regex or Zod) before sending.

---

### 3.3 Verify page `onChange` pattern

**Severity: LOW**

**Location:** `src/app/verify/page.tsx`

**Issue:** `onChange={(e) => handleEmailChange(e.target.value)}` – works but is slightly unusual; could be simplified.

---

## 4. Performance

### 4.1 Queries

- **Teacher lessons:** Uses `include`; no N+1
- **Book submit:** `adminsPreload` fetched once
- **Availability:** Uses `Promise.all` for slots and taken lessons

### 4.2 Re-renders

- **Report page:** Draft save runs on every keystroke
- **Book page:** Multiple `useEffect`s; `AbortController` used for availability race (good)

### 4.3 Recommendations

| Item | Priority | Action |
|------|----------|--------|
| Report draft | Low | Debounce draft saves (e.g. 500 ms) |
| LoginCode | Low | Add `@@index([email])`, `@@index([expiresAt])` |
| Session cleanup | Low | Cron or background job to delete expired sessions |

---

## 5. Middleware & Routing

| Issue | Severity | Description |
|-------|----------|-------------|
| Role-based paths | Medium | Middleware only checks session; role checks in layouts |
| `/book` for non-students | Low | Teachers/admins can reach `/book`; submit returns 403 |
| `/welcome` redirect | Low | Redirects to `/book`; route may be unused |

---

## 6. Summary & Action Items

### High priority (security)

1. Add auth to PDF endpoint – verify user is teacher/student/admin for the lesson.
2. Require and validate `CRON_SECRET` for cron routes.
3. Add OTP rate limiting (per email and per IP).

### Medium priority

4. Validate email format in request-code.
5. Handle Resend errors in `sendBookingConfirmation` and `sendLessonCompleted`.
6. Move admin email to env (e.g. `ADMIN_TEACHER_EMAILS`).
7. Fail startup if `COOKIE_SECRET` is missing in production.

### Low priority

8. Debounce report draft saves.
9. Add LoginCode indexes.
10. Add session cleanup job.
11. Redirect non-students from `/book` to their dashboards.

---

*Generated from codebase exploration and manual verification.*
