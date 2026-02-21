# Paza Lessons — Architecture Flowchart

High-level and flow-level architecture in flowchart form (Mermaid). Render in GitHub, VS Code (Mermaid extension), or [mermaid.live](https://mermaid.live).

---

## 1. System overview

```mermaid
flowchart TB
  subgraph Client["Client (Browser)"]
    User[User]
  end

  subgraph Host["Deployment (Netlify / Vercel)"]
    Next["Next.js 14 App"]
    API["API Routes"]
    MW["Middleware"]
    Next --> API
    Next --> MW
  end

  subgraph Data["Data & External"]
    DB[(Supabase Postgres)]
    Resend["Resend (Email)"]
  end

  User -->|HTTPS| Next
  MW -->|allow/redirect| Next
  API -->|Prisma| DB
  API -->|send email| Resend
```

---

## 2. Request flow (middleware & routes)

```mermaid
flowchart LR
  Request[Request] --> MW{Middleware}
  MW -->|"/" "/login" "/verify" "/book" "/teacher*" "/api/auth*" "/api/cron*"| Allow[Allow]
  MW -->|other path| Cookie{Session cookie?}
  Cookie -->|no| Redirect["Redirect → /login"]
  Cookie -->|yes| Allow
  Allow --> App[App / API]
```

---

## 3. Page & role flow (user journeys)

```mermaid
flowchart TB
  Start["/ (Landing)"] --> Choice{User action}
  Choice -->|Book a lesson| Book["/book (Wizard)"]
  Choice -->|See teachers| Teachers["/teacher (List)"]
  Choice -->|Login| Login["/login"]

  Book --> PickTeacher[Pick teacher]
  PickTeacher --> PickSlot[Pick slot]
  PickSlot --> Form[Submit booking form]
  Form --> APIBook["POST /api/lessons/book"]
  APIBook --> Success["/book/success"]

  Login --> Email[Enter email]
  Email --> ReqCode["POST /api/auth/request-code"]
  ReqCode --> Resend1[Resend: OTP email]
  Resend1 --> Verify["/verify (Enter code)"]
  Verify --> VerCode["POST /api/auth/verify-code"]
  VerCode --> CreateSession[Create session cookie]
  CreateSession --> Role{Role?}

  Role -->|admin| Admin["/admin"]
  Role -->|teacher| Teacher["/teacher (dashboard)"]
  Role -->|student| Student["/student"]
  Role -->|parent| Parent["/parent"]
```

---

## 4. Auth flow (login & session)

```mermaid
flowchart TB
  A["/login"] --> B[User enters email]
  B --> C["POST /api/auth/request-code"]
  C --> D[Create LoginCode in DB]
  C --> E[sendLoginCode → Resend]
  E --> F["/verify"]
  F --> G[User enters code]
  G --> H["POST /api/auth/verify-code"]
  H --> I{Code valid?}
  I -->|no| J[401]
  I -->|yes| K[Create Session in DB]
  K --> L[Set session cookie]
  L --> M[Redirect by role]
```

---

## 5. Booking flow (public)

```mermaid
flowchart TB
  B1["/book"] --> B2["GET /api/teachers"]
  B2 --> B3[Choose teacher]
  B3 --> B4["GET /api/teachers/[id]/availability"]
  B4 --> B5[Choose slot]
  B5 --> B6[Form: name, phone, question]
  B6 --> B7["POST /api/lessons/book"]
  B7 --> B8[Prisma: Lesson + StudentProfile if new]
  B8 --> B9[sendBookingConfirmation → Resend]
  B9 --> B10["/book/success"]
```

---

## 6. Teacher flow (lessons & completion)

```mermaid
flowchart TB
  T1["/teacher (dashboard)"] --> T2["GET /api/teacher/lessons"]
  T1 --> T3["GET /api/teacher/availability"]
  T1 --> T4["GET /api/teacher/students"]
  T3 --> T5[Manage availability]
  T5 --> T6["POST/PUT /api/teacher/availability"]

  T2 --> T7[Lesson list]
  T7 --> T8[Complete lesson]
  T8 --> T9["POST /api/teacher/lessons/[id]/complete"]
  T9 --> T10[LessonSummary in DB]
  T9 --> T11[sendLessonCompleted + PDF → Resend]
```

---

## 7. Admin flow (invites)

```mermaid
flowchart TB
  A1["/admin"] --> A2["GET /api/admin/invites"]
  A2 --> A3[Invites list]
  A3 --> A4[Create invite]
  A4 --> A5["POST /api/admin/invite"]
  A5 --> A6[Invite row in DB]
  A6 --> A7[Optional: send email with link]
  A7 --> A3
```

---

## 8. API routes map

```mermaid
flowchart LR
  subgraph Auth["Auth"]
    R1["/api/auth/request-code"]
    R2["/api/auth/verify-code"]
    R3["/api/auth/logout"]
    R4["/api/auth/test-login"]
  end

  subgraph Public["Public"]
    R5["/api/teachers"]
    R6["/api/teachers/[id]/availability"]
    R7["/api/lessons/book"]
  end

  subgraph Teacher["Teacher"]
    R8["/api/teacher/lessons"]
    R9["/api/teacher/lessons/[id]/complete"]
    R10["/api/teacher/availability"]
    R11["/api/teacher/students"]
  end

  subgraph Student["Student"]
    R12["/api/student/lessons"]
  end

  subgraph Parent["Parent"]
    R13["/api/parent/lessons"]
  end

  subgraph Admin["Admin"]
    R14["/api/admin/invites"]
    R15["/api/admin/invite"]
  end

  subgraph Cron["Cron"]
    R16["/api/cron/follow-up"]
  end

  subgraph Other["Other"]
    R17["/api/pdf/[...path]"]
  end
```

---

## 9. Data model (Prisma → Supabase)

```mermaid
erDiagram
  User ||--o| TeacherProfile : has
  User ||--o| StudentProfile : has
  User ||--o{ Session : has
  User ||--o{ Availability : "teacher"
  User ||--o{ Lesson : "teacher"
  User ||--o{ Lesson : "student"
  Lesson ||--o| LessonSummary : has
  Invite }o--|| User : "role"
  LoginCode }o--|| User : "email"

  User {
    string id
    string email
    string name
    enum role
  }

  Lesson {
    string id
    date date
    string startTime
    string endTime
    enum status
  }

  Availability {
    string id
    date date
    string startTime
    string endTime
  }
```

---

## 10. External services

```mermaid
flowchart LR
  App[Next.js API]
  App -->|DATABASE_URL| Supabase[(Supabase Postgres)]
  App -->|RESEND_API_KEY| Resend[Resend]
  App -->|COOKIE_SECRET| Cookie[Session cookie sign]
  Cron[Netlify/Vercel Cron] -->|GET /api/cron/follow-up| App
  Cron --> App
```

---

## Summary table

| Layer        | Tech / Location |
|-------------|------------------|
| Frontend    | Next.js 14 (App Router), React, Tailwind, RTL (Heebo) |
| Auth        | Session cookie, LoginCode + verify, Invite for teachers |
| API         | Next.js Route Handlers under `/api` |
| Database    | Supabase (Postgres), Prisma ORM |
| Email       | Resend (OTP, booking, lesson summary, follow-up) |
| Hosting     | Netlify or Vercel |
| Cron        | Follow-up reminders via host cron → `/api/cron/follow-up` |
