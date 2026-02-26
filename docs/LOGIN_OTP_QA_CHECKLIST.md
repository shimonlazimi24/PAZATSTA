# Email OTP Login – QA Checklist

## What caused the 7.5 second delay

The `request-code` API was **awaiting** `sendLoginCode(email, code)` before returning. Resend’s email API typically takes 5–10 seconds to respond. The handler was blocked until the email was sent, so the client waited for the full response.

**Fix:** Return 200 immediately after the DB write (OTP is stored). Then call `sendLoginCode` in the background with `void sendLoginCode(...).then(...).catch(...)` so the response is not blocked. The user can enter the code as soon as the API returns; the email is sent in parallel.

## What changed

- **Removed intermediate screen**: Student/Teacher/Admin no longer navigate to `/verify`. OTP input appears inline on the same page.
- **Optimistic UI**: On "Send Code" click, UI immediately switches to OTP screen. API runs in background. Shows "שולחים קוד..." while sending.
- **7.5s delay fixed**: `request-code` API returns 200 immediately after DB write. Email is sent asynchronously (fire-and-forget). The delay was caused by awaiting Resend API before responding.

## Manual QA

### Student login (`/login/student`)

- [ ] Enter email + phone, click "שלחו לי קוד"
- [ ] OTP screen appears **immediately** (no wait)
- [ ] "שולחים קוד..." appears briefly
- [ ] OTP input is autofocused
- [ ] Enter 6-digit code → redirects to `/student` (or `/book`)
- [ ] If send fails: error shown, "חזרה לאימייל" allows retry
- [ ] Test login buttons still work

### Teacher login (`/login/teacher`)

- [ ] Enter email, click "שלחו לי קוד"
- [ ] OTP screen appears **immediately**
- [ ] "שולחים קוד..." appears briefly
- [ ] OTP input autofocused
- [ ] Enter code → redirects to `/teacher/dashboard`
- [ ] If send fails: error shown, retry possible

### Admin login (`/login/admin`)

- [ ] Enter email, click "שלח קוד"
- [ ] OTP screen appears **immediately**
- [ ] Same flow as teacher
- [ ] Enter code → redirects to `/admin`

### Verify page (`/verify`)

- [ ] Direct link with `?email=...&role=...` still works (e.g. from old bookmark)
- [ ] Resend code works
- [ ] Submit code works

### Server logs (optional)

- [ ] Run `npm run dev`, trigger request-code
- [ ] Console shows: `[request-code] DB write: Xms`, `[request-code] Total handler: Xms`
- [ ] Later: `[request-code] Email send: Xms, sent=true/false`
