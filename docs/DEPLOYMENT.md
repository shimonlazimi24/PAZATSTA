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
   | `DATABASE_URL` | Your Supabase connection string | Same as in `.env` (Supabase Dashboard → Project Settings → Database → Connection string, “URI”) |
   | `COOKIE_SECRET` | Random string ≥ 32 chars | e.g. `openssl rand -hex 32` |
   | `RESEND_API_KEY` | Your Resend API key | So login OTP and booking emails work |
   | `RESEND_FROM` | (optional) e.g. `noreply@yourdomain.com` | Must be a verified domain in Resend or use `onboarding@resend.dev` for testing |
   | `APP_URL` | e.g. `https://your-app.vercel.app` | Required for public PDF links in emails (no login) |

4. **Deploy** (Vercel will run `npm run build` and start the app).
5. Your **public link** is: `https://<your-project-name>.vercel.app` (or your custom domain if you add one).

**Supabase:** No change needed. Supabase allows connections from the internet; Vercel’s servers will connect using `DATABASE_URL`. If you ever enable “Restrict connections” in Supabase, add Vercel’s IPs or use “Allow all” for the pooler.

**Migrations:** Run them against the same DB before or after deploy (from your machine, with the same `DATABASE_URL`):

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Option 2: Netlify

Yes, **Netlify is fine** for this Next.js app. Use `@netlify/plugin-nextjs`.

**Critical:** In Netlify UI, set **Publish directory** = Not set and **Functions directory** = Not set. The `netlify.toml` sets `publish = ".next"` explicitly (required to avoid "publish directory cannot be the same as base directory" plugin error).

1. **Push your code to GitHub** (if not already).

2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project** → connect your repo.

3. **Build settings:**
   - **Build command:** `npx prisma migrate deploy && npm run build` (or use `netlify.toml`)
   - **Publish directory:** Not set (netlify.toml provides `publish = ".next"`)
   - **Base directory:** leave empty unless the app is in a subfolder

4. **Environment variables** (Site → Site configuration → Environment variables). Add:

   | Name | Value | Scopes |
   |------|--------|--------|
   | `DATABASE_URL` | Your Supabase Postgres URI | All |
   | `COOKIE_SECRET` | Random string ≥ 32 chars | All |
   | `RESEND_API_KEY` | Your Resend API key | All |
   | `RESEND_FROM` | (optional) e.g. `onboarding@resend.dev` | All |
   | `APP_URL` | e.g. `https://your-site.netlify.app` | Required for public PDF links in emails (no login) |

5. **Deploy.** Netlify will run `npm install`, `prisma generate` (via postinstall), and `next build`. Your **public link** is: `https://<your-site-name>.netlify.app` (or your custom domain).

**Note:** Netlify’s Next.js runtime supports App Router and API routes. Prisma works as long as `DATABASE_URL` is set; `postinstall` runs `prisma generate` so the client is available at build time.

### Netlify static assets checklist (if `/_next/static/*` returns 404)

- [ ] **Publish directory** in Netlify UI is **Not set** (netlify.toml sets `publish = ".next"`)
- [ ] **Functions directory** in Netlify UI is **Not set**
- [ ] **`@netlify/plugin-nextjs`** is enabled (in `netlify.toml` via `[[plugins]]` and/or Netlify UI)
- [ ] Redeploy with **"Clear cache and deploy site"** (Site → Deploys → Trigger deploy → Clear cache and deploy site)

### Post-deploy verification

After deploying, verify that Next.js static assets are served correctly:

```bash
# Replace <site> with your Netlify site name (e.g. pazatsta-schedule)
# Get a real CSS hash from your built .next/static/css/ folder or from the page source
curl -I https://<site>.netlify.app/_next/static/css/<hash>.css
```

Expected: `HTTP/2 200` and `Content-Type: text/css`. If you get 404, the publish directory is likely misconfigured.

---

## Option 3: Other hosts (Railway, Render, etc.)

Same idea:

1. Connect the repo; **build** = `npm run build`, **start** = `npm run start`.
2. Set **env vars**: `DATABASE_URL`, `COOKIE_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` (optional).
3. Deploy and use the public URL the host gives you.

---

## Checklist before going live

- [ ] `DATABASE_URL` on the host = your Supabase Postgres URI (pooler URI is fine).
- [ ] `COOKIE_SECRET` set (and not the default “fallback”).
- [ ] `RESEND_API_KEY` set so login and booking emails work.
- [ ] Migrations applied: `npx prisma migrate deploy`.
- [ ] Seed run if needed: `npx prisma db seed`.
- [ ] Test login and booking on the public URL; test-login (`/login` → “כניסה כמורה/תלמיד”) is disabled in production, so use real OTP or create an invite for a teacher.

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
