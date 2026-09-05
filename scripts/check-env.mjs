/**
 * Fail a production build when the environment it would run in is misconfigured.
 *
 * This runs as its own build step rather than from next.config.js, because that
 * file is also loaded by `next lint`, and linting has no business requiring a
 * runtime secret — CI does not have one and should not.
 *
 * COOKIE_SECRET is fatal: it signs session cookies and hashes OTPs, so without it
 * the deployed app cannot authenticate anyone. The rest are warnings; the app
 * serves pages without them, but each one silently disables something.
 */

const MIN_SECRET_LENGTH = 32;

const WARN_IF_MISSING = [
  ["DATABASE_URL", "the app cannot reach the database"],
  ["CRON_SECRET", "every cron endpoint returns 503"],
  ["ADMIN_NOTIFICATION_EMAILS", "admin notifications reach only admin User rows"],
  ["RESEND_API_KEY", "no email is sent, including login codes"],
  ["APP_URL", "public lesson-summary links are not generated"],
];

// Only guard real deployments. A local `npm run build` for a smoke test, and CI,
// both set NODE_ENV=production without being a deploy, so key off the hosting
// platform instead: Vercel sets VERCEL=1 during the build.
const isDeployBuild = process.env.VERCEL === "1" || process.env.CHECK_ENV_STRICT === "1";

if (!isDeployBuild) {
  console.log("[check-env] Not a deployment build — skipping.");
  process.exit(0);
}

const secret = process.env.COOKIE_SECRET;
if (!secret || secret.length < MIN_SECRET_LENGTH) {
  console.error(
    `\n[check-env] COOKIE_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters.\n` +
      "It signs session cookies and hashes OTPs; without it nobody can log in.\n" +
      "Set it in the deployment environment. Generate one with:\n" +
      "  openssl rand -base64 48\n"
  );
  process.exit(1);
}

let warned = false;
for (const [name, consequence] of WARN_IF_MISSING) {
  if (!process.env[name]?.trim()) {
    console.warn(`[check-env] ${name} is not set — ${consequence}.`);
    warned = true;
  }
}
if (warned) console.warn("[check-env] See docs/DEPLOYMENT.md.");

console.log("[check-env] Deployment environment looks complete.");
