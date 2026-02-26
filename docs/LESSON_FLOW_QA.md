# Lesson Flow – QA Checklist

**Scope:** Summary Report gating (status + lesson end time)  
**Date:** Feb 2025

---

## What Was Wrong

- Teachers could fill and submit a "Lesson Summary Report" even when:
  - The lesson was **not approved** (pending_approval or canceled)
  - The lesson **had not ended yet** (before lesson end time)
- No server-side enforcement beyond `status === "scheduled"`
- Direct API calls could bypass UI guards

---

## What Was Fixed

1. **Canonical statuses** – Confirmed `LessonStatus` (Prisma + TS): `pending_approval`, `scheduled`, `completed`, `canceled`
2. **UI gating** – Report button only when `status === "scheduled"` AND `now >= lessonEnd`
3. **Route protection** – Report page redirects if status ≠ approved; blocks if lesson not ended
4. **Server-side** – Complete API validates `status === "scheduled"` and `now >= lessonEnd`; returns 403 on failure
5. **Add to Calendar** – Shown only when `status === "scheduled"` AND `now < lessonStart`
6. **Follow Up** – Shown only when `reportStatus === SUBMITTED` (reportCompleted + summary exists)

---

## QA Checklist

| Scenario | Expected | Verify |
|----------|----------|--------|
| **Pending approval lesson** | No report button; cannot access report route; API returns 403 | ☐ |
| **Approved but before end time** | No report button (or disabled); report page shows "אפשר למלא דוח רק אחרי השיעור"; API blocked | ☐ |
| **Approved and after end time** | Report button visible; report page allows submit; API accepts | ☐ |
| **After submit** | Follow Up visible; report read-only | ☐ |
| **Canceled/declined** | No report button; message "השיעור לא אושר"; direct route redirects to dashboard with error; API returns 403 | ☐ |
| **Add to Calendar** | Shown only for scheduled lessons before start time | ☐ |
| **Direct API POST** | Bypass attempt: 403 with clear Hebrew error | ☐ |

---

## Files Changed

- `src/lib/dates.ts` – `isLessonEnded`, `isLessonStarted`
- `src/types.ts` – `LessonStatus`, `ReportStatus`
- `src/app/api/teacher/lessons/[id]/complete/route.ts` – lessonEnd validation, 403 for wrong status
- `src/components/teacher/TeacherHomeLessons.tsx` – UI gating for report button and Add to Calendar
- `src/app/teacher/lesson/[id]/report/page.tsx` – Route protection, block when not ended
- `src/components/teacher/TeacherDashboardContent.tsx` – Error banner on redirect
