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

Yes, **Netlify is fine** for this Next.js app. Use the built-in Next.js support.

1. **Push your code to GitHub** (if not already).

2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project** → connect your repo.

3. **Build settings** (Netlify usually detects Next.js automatically):
   - **Build command:** `npm run build` (or `next build`)
   - **Publish directory:** leave as default (Netlify’s Next.js plugin sets this)
   - **Base directory:** leave empty unless the app is in a subfolder

4. **Environment variables** (Site → Site configuration → Environment variables). Add:

   | Name | Value | Scopes |
   |------|--------|--------|
   | `DATABASE_URL` | Your Supabase Postgres URI | All |
   | `COOKIE_SECRET` | Random string ≥ 32 chars | All |
   | `RESEND_API_KEY` | Your Resend API key | All |
   | `RESEND_FROM` | (optional) e.g. `onboarding@resend.dev` | All |

5. **Deploy.** Netlify will run `npm install`, `prisma generate` (via postinstall), and `next build`. Your **public link** is: `https://<your-site-name>.netlify.app` (or your custom domain).

**Note:** Netlify’s Next.js runtime supports App Router and API routes. Prisma works as long as `DATABASE_URL` is set; `postinstall` runs `prisma generate` so the client is available at build time.

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

## Summary

| What | Where it runs |
|------|----------------|
| **Database** | Supabase (already). Same DB for local and production if you use the same `DATABASE_URL`. |
| **UI + API** | Deployment host (e.g. Vercel). One public URL for the whole app. |
| **Secrets** | Set in the host’s dashboard (Vercel → Settings → Environment Variables). |

So: **backend and DB are already connected to Supabase**. To get a **public link for the whole UI**, deploy the Next.js app to Vercel (or another host), set the env vars, and use the URL the host gives you.
