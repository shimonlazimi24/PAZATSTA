# Test Users & How Scheduling Works

## Where teacher ↔ student connect (availability)

The link between teachers and students for **availability** is the **Availability** table and one API that exposes it by teacher:

1. **Database**
   - **`Availability`** has `teacherId` (and `date`, `startTime`, `endTime`). Each row = “this teacher is free at this date/time.” There is no student on availability — it’s only teacher slots.
   - When a slot is booked, a **`Lesson`** is created with `teacherId` + `studentId`, and that **Availability** row is deleted (so the slot can’t be booked again).

2. **Teacher side (who creates the connection)**
   - Teacher logs in → **`/teacher`** dashboard.
   - **TeacherAvailability** calls **`POST /api/teacher/availability`** with `date`, `startTime`, `endTime` → creates **Availability** rows with `teacherId = current user`. So the teacher’s user id is the “teacher” side of the connection.

3. **Student side (who consumes the connection)**
   - Student logs in → **`/student`** dashboard.
   - **BrowseTeachers** loads teachers from **`GET /api/teachers`** (list of users with role `teacher`).
   - When the student **selects a teacher**, the app calls:
     - **`GET /api/teachers/[teacherId]/availability?start=...&end=...`**
   - That’s the **exact place** where “teacher” and “availability” meet for the student: **`teacherId`** in the URL is the teacher’s user id; the API returns only that teacher’s **Availability** rows (from the same table the teacher filled on `/teacher`).
   - So the connection in the UI is: **selected teacher id** → request to **`/api/teachers/{id}/availability`** → same `Availability` table filtered by `teacherId`.

4. **Booking (turning availability into a teacher–student link)**
   - Student picks one returned slot (each has an **`id`** = Availability row id).
   - **BookLessonForm** sends **`POST /api/lessons/book`** with **`availabilityId: slot.id`** (and name, phone, email, etc.).
   - **`/api/lessons/book`**:
     - Loads the **Availability** row by `availabilityId` → gets **`teacherId`** from that row.
     - Resolves **student** (from session if role=student, or by email if role=parent).
     - Creates **Lesson** with that `teacherId` and `studentId`, then **deletes** the Availability row.

**Summary:** The connection between teachers and students for availability is:

- **Stored as:** `Availability.teacherId` (slot belongs to which teacher).
- **Exposed to students at:** **`GET /api/teachers/[id]/availability`** — one teacher id → that teacher’s available slots.
- **Turned into a teacher–student meeting at:** **`POST /api/lessons/book`** — one `availabilityId` (and thus one teacher) + logged-in or provided student → one **Lesson** and the slot is removed.

---

## Test user emails (for student & teacher pages)

After running `npx prisma db seed`:

| Role    | Email             | Name        | How to log in                    |
|---------|-------------------|------------|-----------------------------------|
| Teacher | **teacher@test.com** | דני כהן   | On `/login` click **כניסה כמורה** |
| Student | **student@test.com** | רוני ישראלי | On `/login` click **כניסה כתלמיד** |

- **Admin** (for `/admin`): use normal login with **admin@paza.local** (seed creates this user; you need to request a code to that email or use your auth flow).

---

## How scheduling works (the important flow)

There are two scheduling-related flows in the app:

### 1. Real scheduling (database + API) – used by teacher/student dashboards

This is the flow that actually creates lessons and uses the DB.

**Teacher side (when logged in as teacher → `/teacher`):**

- The teacher dashboard uses **TeacherAvailability** and **TeacherUpcomingLessons**.
- **Availability** is stored in the `Availability` table (per teacher).
- APIs:
  - `GET /api/teacher/availability?start=...&end=...` – list my slots
  - `POST /api/teacher/availability` – add slot (body: `date`, `startTime`, `endTime`)
  - `DELETE /api/teacher/availability?id=...` – remove a slot
- Teacher adds date + start/end time; slots are shown in a list and can be removed.

**Student/Parent side (when logged in as student → `/student`):**

- **BrowseTeachers** loads teachers from `GET /api/teachers`.
- When a teacher is selected, slots are loaded from  
  `GET /api/teachers/[teacherId]/availability?start=...&end=...`  
  (reads from `Availability` where `teacherId` and `isAvailable: true`).
- **BookLessonForm** sends `POST /api/lessons/book` with:
  - `availabilityId` (the slot to book)
  - `fullName`, `phone`, `email`, optional `questionFromStudent`
- **Booking API** (`/api/lessons/book`):
  - Finds the `Availability` row by `availabilityId`.
  - Creates a **Lesson** (teacher, student, date, startTime, endTime, status `scheduled`).
  - **Deletes** that availability slot (so it can’t be double-booked).
  - Optionally sends booking confirmation emails.

So the “important” scheduling page for **real** use is:

- **Teacher:** the dashboard at `/teacher` (when logged in as teacher) where they manage availability via the form that calls the APIs above.
- **Student:** the dashboard at `/student` (when logged in as student) where they pick a teacher, see that teacher’s available slots, and book with the form that calls `POST /api/lessons/book`.

**Relevant code:**

- Teacher availability: `src/app/api/teacher/availability/route.ts` (GET/POST/DELETE)
- List a teacher’s slots for booking: `src/app/api/teachers/[id]/availability/route.ts` (GET)
- Create a lesson from a slot: `src/app/api/lessons/book/route.ts` (POST)
- UI: `TeacherAvailability.tsx`, `BrowseTeachers.tsx`, `BookLessonForm.tsx`

---

### 2. Mock / UI-only scheduling (no DB)

- **Public booking wizard** (`/book`): Uses mock teachers and mock slots from `src/data/mockTeachers.ts` and `src/data/mockSlots.ts`. No API calls for availability or booking; nothing is saved to the DB. Good for demoing the 6-step flow only.
- **Public teacher availability grid** (`/teacher` when not logged in, or the standalone grid page): The weekly grid that lets you toggle cells is stored only in **localStorage** (`teacher-availability`). No backend; for demo/UI only.

---

## Quick checklist for testers

1. Run `npx prisma db seed` (creates teacher@test.com, student@test.com, admin@paza.local).
2. Open `/login` → use **כניסה כמורה** → you should land on `/teacher` (teacher dashboard with availability + lessons).
3. Open `/login` in another browser/incognito → use **כניסה כתלמיד** → you should land on `/student` (book a lesson + my lessons).
4. On teacher: add availability (date + time range). Those slots appear in the list and are stored in the DB.
5. On student: choose a teacher, see their real slots from the DB, fill the form and book. That creates a lesson and removes the slot from availability.
