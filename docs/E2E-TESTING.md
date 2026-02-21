# E2E Testing with Playwright

## Setup

1. **Install dependencies** (already in `package.json`):
   ```bash
   npm install
   ```

2. **Install Playwright browsers** (required once per machine):
   ```bash
   npx playwright install
   ```
   Or only Chromium:
   ```bash
   npx playwright install chromium
   ```

## Running tests

- **Run all E2E tests** (starts dev server if not running, or reuses existing one on port 3000):
  ```bash
  npm run test:e2e
  ```

- **Run with UI** (interactive mode, pick tests, watch):
  ```bash
  npm run test:e2e:ui
  ```

- **Run a single file**:
  ```bash
  npx playwright test e2e/login.spec.ts
  ```

- **Run in headed mode** (see the browser):
  ```bash
  npx playwright test --headed
  ```

- **Debug**:
  ```bash
  npx playwright test --debug
  ```

## What’s covered

- **`e2e/login.spec.ts`** – Login page RTL/ Hebrew, email + send code, test login as teacher/student → redirect to `/teacher` and `/student`.
- **`e2e/landing.spec.ts`** – Landing hero, CTA, navbar link to `/book`, category cards.
- **`e2e/booking.spec.ts`** – Booking wizard: stepper, step 1 subject, flow to step 4 (date) with subject → grade → teacher.
- **`e2e/teacher-dashboard.spec.ts`** – After test-login as teacher: greeting, stats, lessons table, availability section.
- **`e2e/student-dashboard.spec.ts`** – After test-login as student: booking section, “השיעורים שלי”, teacher selector.

## Config

- **`playwright.config.ts`** – `baseURL: http://localhost:3000`, Hebrew locale, Chromium. `webServer` starts `npm run dev` and reuses an existing server on 3000 if present.

## Troubleshooting

- **“Executable doesn't exist”** → Run `npx playwright install` (or `npx playwright install chromium`).
- **Port 3000 in use** → Config uses `reuseExistingServer: true`, so an existing dev server is reused; ensure nothing else is using 3000 or change `baseURL` and `webServer.url` to another port.
- **Tests fail on login/redirect** → Ensure backend and DB are up; test-login calls `/api/auth/test-login` and requires seeded users (`npm run db:seed`).
