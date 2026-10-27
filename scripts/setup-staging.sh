#!/usr/bin/env bash
# One-time setup of the staging environment.
#
#   1. Creates the tables in the staging database (pazatsta-staging on Supabase).
#   2. Points every Vercel Preview deployment (incl. the `staging` branch) at that
#      database, with its own secrets, the email guard switched on, and all mail
#      redirected to one QA inbox.
#
# Secrets are read hidden and piped straight into Prisma / Vercel; nothing is
# printed or written to disk. Production variables are not touched by this script.
#
# Before running step 2, Preview must be unticked on the production variables in
# the Vercel dashboard (see the instructions you were given), or Vercel will refuse.

set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/fixTok/node-toolchain/bin:$HOME/.local/bin:$PATH"

echo "== Staging setup =="
echo
echo "Paste the Transaction pooler connection string from Supabase"
echo "(it contains [YOUR-PASSWORD] — paste it exactly as shown):"
read -r URI_TEMPLATE
case "$URI_TEMPLATE" in
  *wqmdjbhvonzoyhucdith*) ;;
  *) echo "This is not the pazatsta-staging project's string. Stopping."; exit 1 ;;
esac
case "$URI_TEMPLATE" in
  *"[YOUR-PASSWORD]"*) ;;
  *) echo "Expected the string with [YOUR-PASSWORD] in it. Stopping."; exit 1 ;;
esac

echo "Paste the staging database password (nothing will show while you paste):"
read -rs DB_PASSWORD
echo
[ -n "$DB_PASSWORD" ] || { echo "Empty password. Stopping."; exit 1; }

ENC_PASSWORD=$(DB_PASSWORD="$DB_PASSWORD" node -e 'process.stdout.write(encodeURIComponent(process.env.DB_PASSWORD))')
BASE_URI="${URI_TEMPLATE/\[YOUR-PASSWORD\]/$ENC_PASSWORD}"
BASE_URI="${BASE_URI%%\?*}"
# Transaction pooler (6543) for the app; the same host on 5432 is the session pooler, used for migrations.
STAGING_DATABASE_URL="${BASE_URI}?pgbouncer=true&connection_limit=1"
STAGING_DIRECT_URL="${BASE_URI/:6543\//:5432/}"

echo
echo "-- Step 1: creating tables in the staging database"
DATABASE_URL="$STAGING_DATABASE_URL" DIRECT_URL="$STAGING_DIRECT_URL" npx prisma migrate deploy
echo "Tables created."

echo
read -r -p "-- Step 2: have you unticked Preview on the production variables in Vercel? (yes/no) " READY
[ "$READY" = "yes" ] || { echo "Stopped before touching Vercel. Run again when ready."; exit 0; }

read -r -p "Email address that should receive ALL staging emails: " QA_INBOX
case "$QA_INBOX" in *@*.*) ;; *) echo "Not an email address. Stopping."; exit 1 ;; esac

# Safety check: none of these may still be shared with production on Preview.
# (Never use `vercel env add --force` here: it can overwrite a variable that is
# shared with Production.)
SHARED=$(vercel env ls preview 2>/dev/null | awk '{print $1}' \
  | grep -E '^(DATABASE_URL|DIRECT_URL|COOKIE_SECRET|CRON_SECRET|APP_URL|APP_ENV|EMAIL_REDIRECT_TO)$' || true)
if [ -n "$SHARED" ]; then
  echo "These are still set for Preview (shared with production):"
  echo "$SHARED"
  echo "Untick Preview on them in the Vercel dashboard first. Nothing was changed."
  exit 1
fi

add_preview() { # name value — value is piped, never echoed; Preview only, all branches
  printf '%s' "$2" | vercel env add "$1" preview --sensitive --yes >/dev/null
  echo "  set $1 (Preview)"
}

add_preview DATABASE_URL "$STAGING_DATABASE_URL"
add_preview DIRECT_URL "$STAGING_DIRECT_URL"
add_preview COOKIE_SECRET "$(openssl rand -hex 32)"
add_preview CRON_SECRET "$(openssl rand -hex 32)"
add_preview APP_ENV "staging"
add_preview EMAIL_REDIRECT_TO "$QA_INBOX"
add_preview APP_URL "https://pazatsta-git-staging-shimonlazimi24s-projects.vercel.app"

unset DB_PASSWORD ENC_PASSWORD BASE_URI STAGING_DATABASE_URL STAGING_DIRECT_URL
echo
echo "Done. Tell Claude 'הסקריפט סיים' so it can redeploy staging and verify."
