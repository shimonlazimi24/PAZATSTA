#!/usr/bin/env bash
# Points PRODUCTION at Supabase's transaction pooler (port 6543).
#
# Production was on the session pooler (5432), which holds one database
# connection per open client and stops at 15. Under load the site then fails
# with EMAXCONNSESSION. The transaction pooler shares connections between
# requests, which is what serverless needs. Migrations keep using DIRECT_URL.
#
# You paste the connection string and password; they go straight to Vercel
# and are never printed or saved.
set -euo pipefail
export PATH="$HOME/fixTok/node-toolchain/bin:$HOME/fixTok/node-toolchain/pg/bin:$HOME/.local/bin:$PATH"

STAGING_REF="wqmdjbhvonzoyhucdith"

echo "בסופהבייס: הפרויקט של הפרודקשן (לא staging) > Connect > Transaction pooler"
read -r -p "הדבק את הכתובת של Transaction pooler (עם [YOUR-PASSWORD]): " BASE
case "$BASE" in
  *pooler.supabase.com:6543/*) ;;
  *) echo "זו לא הכתובת של Transaction pooler (היא צריכה להסתיים ב-6543/postgres). לא שיניתי כלום."; exit 1 ;;
esac
case "$BASE" in
  *"$STAGING_REF"*) echo "זו הכתובת של סביבת הבדיקות, לא של הפרודקשן. לא שיניתי כלום."; exit 1 ;;
esac
read -r -s -p "הדבק את הסיסמה של מסד הנתונים של הפרודקשן (היא לא תוצג): " PW
echo
PW="$(printf '%s' "$PW" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
ENC_PW=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$PW")
URL="${BASE/\[YOUR-PASSWORD\]/$ENC_PW}"
URL="${URL%%\?*}"

echo "בודק את החיבור…"
if ! ERR=$(psql "$URL" -Atc "select 1" 2>&1 >/dev/null); then
  echo "לא הצלחתי להתחבר. לא שיניתי כלום. הסיבה:"
  printf '%s\n' "$ERR" | sed -E 's#postgres(ql)?://[^ ]*#[כתובת]#g' | head -3
  exit 1
fi

FINAL="${URL}?pgbouncer=true&connection_limit=1"
vercel env rm DATABASE_URL production -y >/dev/null 2>&1 || true
if ! printf "%s" "$FINAL" | vercel env add DATABASE_URL production --sensitive --yes >/dev/null; then
  echo "השמירה ב-Vercel נכשלה. האתר שרץ עכשיו לא השתנה. תכתוב לClaude מה הופיע."
  exit 1
fi
echo "בוצע: הפרודקשן מתחבר עכשיו דרך Transaction pooler."
echo "תכתוב לClaude 'סיים', והוא יעלה את האתר מחדש ויבדוק אותו."
