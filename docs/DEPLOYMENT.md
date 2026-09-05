# Deploying Paza Lessons (public link)

Your **database is already on Supabase**. The app uses `DATABASE_URL` in `.env`; when you deploy the app to a host, you set the same (or a new) `DATABASE_URL` there so the **live app and DB stay connected**.

The **whole UI and API** run on the deployment host. Visitors get a single public URL (e.g. `https://your-app.vercel.app`) for the site; nothing stays “only local” once deployed.

---

## Option 1: Vercel (recommended for Next.js)

1. **Push your code to GitHub** (if not already).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. **Environment variables** (Project → Settings → Environment Variables). Add for **Production** (and Preview if you want):

   | Name | Value | Notes |
   |------|--------|--------|
   | `DATABASE_URL` | Supabase pooler (Transaction mode, port 6543) | For runtime. Use pooler URI from Supabase Dashboard |
   | `DIRECT_URL` | Supabase direct connection | **Required for migrations.** Dashboard → Database → "Direct connection" (not pooler). Prevents "max clients reached" during build |
   | `COOKIE_SECRET` | Random string ≥ 32 chars | **Required.** The server throws on startup without it — there is no fallback. `openssl rand -hex 32` |
   | `CRON_SECRET` | Random string | **Required.** Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>` on cron calls; without it every cron returns 503. `openssl rand -hex 32` |
   | `ADMIN_NOTIFICATION_EMAILS` | Comma-separated addresses | **Required.** Who receives booking-approval and lesson-summary mail. No address is hardcoded any more, so if this is unset those emails go nowhere |
   | `RESEND_API_KEY` | Your Resend API key | So login OTP and booking emails work |
   | `RESEND_FROM` | (optional) e.g. `noreply@yourdomain.com` | Must be a verified domain in Resend or use `onboarding@resend.dev` for testing |
   | `APP_URL` | e.g. `https://your-app.vercel.app` | Required for public PDF links in emails (no login) |
   | `ADMIN_TEACHER_EMAILS` | (optional) comma-separated | Teachers who may also open `/admin` |

4. **Deploy** (Vercel will run `npm run build` and start the app).
5. Your **public link** is: `https://<your-project-name>.vercel.app` (or your custom domain if you add one).

**Supabase:** No change needed. Supabase allows connections from the internet; Vercel’s servers will connect using `DATABASE_URL`. If you ever enable “Restrict connections” in Supabase, add Vercel’s IPs or use “Allow all” for the pooler.

**Migrations:** Run them against the same DB before or after deploy (from your machine, with the same `DATABASE_URL`):

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Option 2: Other hosts (Railway, Render, etc.)

Same idea:

1. Connect the repo; **build** = `npm run build`, **start** = `npm run start`.
2. Set **env vars**: `DATABASE_URL`, `DIRECT_URL`, `COOKIE_SECRET`, `CRON_SECRET`,
   `ADMIN_NOTIFICATION_EMAILS`, `RESEND_API_KEY`, `APP_URL`, and `RESEND_FROM`
   (optional). On a host without built-in cron, point an external scheduler at the
   `/api/cron/*` routes and send `Authorization: Bearer <CRON_SECRET>` yourself.
3. Deploy and use the public URL the host gives you.

---

## Checklist before going live

Secrets — the app now fails closed rather than falling back to a value committed
to the repo, so a missing variable is a visible failure instead of a silent
downgrade:

- [ ] `COOKIE_SECRET` set, ≥ 32 chars. **Without it the server throws on startup.**
- [ ] `CRON_SECRET` set. Without it every cron endpoint returns 503, so pending
      lessons never expire and reminders never go out.
- [ ] `ADMIN_NOTIFICATION_EMAILS` set. Without it approval and summary emails have
      no admin recipient and are silently not delivered to anyone.
- [ ] `DATABASE_URL` on the host = your Supabase Postgres URI. Append
      `?pgbouncer=true&connection_limit=1&pool_timeout=20` when using the
      transaction pooler.
- [ ] `DIRECT_URL` set for migrations (session/direct connection, port 5432).
- [ ] `RESEND_API_KEY` set so login and booking emails work.

Then:

- [ ] Migrations applied: `npx prisma migrate deploy` — see the note below, one of
      them signs everybody out.
- [ ] Seed run if needed: `npx prisma db seed`.
- [ ] Test login and booking on the public URL; test-login (`/login` → “כניסה כמורה/תלמיד”) is disabled in production, so use real OTP or create an invite for a teacher.
- [ ] `APP_URL=https://your-site.vercel.app npm run healthcheck:prod`.

### Migration note: everyone is signed out once

`20260821000000_session_random_token` clears the `Session` table. Session cookies
used to carry the row's cuid; they now carry a random token, and the old rows
cannot be converted. Every signed-in user has to log in again the first time this
runs — schedule it accordingly. Nothing else is affected: users, lessons and
availability are untouched.

`20260821000001_public_pdf_link_expiry` gives existing lesson-summary links an
expiry 90 days after they were created, so links already older than that stop
working immediately. That is intended — they were previously valid forever.

---

## Mobile responsive QA (iPhone ~390px)

**Files changed for responsive nav + layout:**
- `src/components/layout/AppShell.tsx` – main wrapper, drawer state, hamburger
- `src/components/layout/TopBar.tsx` – hamburger button on mobile
- `src/components/layout/Sidebar.tsx` – desktop-only, uses shared nav content
- `src/components/layout/NavDrawer.tsx` – new drawer (slides from right, RTL)
- `src/components/layout/SidebarNavContent.tsx` – shared nav items for sidebar + drawer
- `src/hooks/useNavItems.ts` – fetches nav by role
- `src/components/admin/AdminShell.tsx` – mobile drawer, sidebar hidden on mobile
- `src/components/admin/AdminWeeklyCalendar.tsx` – stacked cards on mobile, table on desktop
- `src/components/admin/PendingLessonsBlock.tsx` – stacked layout, full-width buttons
- `src/app/globals.css` – iOS safe area padding
- `src/app/layout.tsx` – viewport-fit=cover

**How to test on mobile:**
1. Resize browser to ~390px or use DevTools device emulation (iPhone SE/14).
2. **Student/Teacher:** Hamburger (☰) in top bar opens nav drawer from the right. Content is full width; no sidebar squeezing.
3. **Admin:** Same hamburger on admin page; drawer shows "לוח שבועי", "שיעורים בהמתנה", etc.
4. **Admin weekly calendar:** On mobile, days show as stacked cards; on desktop, full table.
5. **Buttons:** Primary actions have min-height 44px for touch.
6. **No horizontal scroll:** Content stays within viewport.

---

## Summary

| What | Where it runs |
|------|----------------|
| **Database** | Supabase (already). Same DB for local and production if you use the same `DATABASE_URL`. |
| **UI + API** | Deployment host (e.g. Vercel). One public URL for the whole app. |
| **Secrets** | Set in the host’s dashboard (Vercel → Settings → Environment Variables). |

So: **backend and DB are already connected to Supabase**. To get a **public link for the whole UI**, deploy the Next.js app to Vercel (or another host), set the env vars, and use the URL the host gives you.
