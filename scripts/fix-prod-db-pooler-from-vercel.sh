#!/usr/bin/env bash
# Same fix as fix-prod-db-pooler.sh, without typing the password: takes the
# production DATABASE_URL already saved in Vercel, switches it from the session
# pooler (5432, max 15 clients) to the transaction pooler (6543) on the same
# host, checks it connects, and saves it back. Nothing secret is printed, and
# the temporary copy is deleted on exit.
set -euo pipefail
export PATH="$HOME/fixTok/node-toolchain/bin:$HOME/fixTok/node-toolchain/pg/bin:$HOME/.local/bin:$PATH"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "מושך מ-Vercel את הכתובת הנוכחית של הפרודקשן…"
vercel env pull "$TMP/prod.env" --environment=production --yes >/dev/null 2>&1 || true
CUR="$(grep -E '^DATABASE_URL=' "$TMP/prod.env" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
rm -f "$TMP/prod.env"

if [ -z "$CUR" ]; then
  echo "Vercel לא מחזיר את הכתובת (היא מוגדרת כסודית). לא שיניתי כלום. תכתוב לClaude 'נכשל'."
  exit 1
fi
case "$CUR" in
  *pooler.supabase.com:5432/*) ;;
  *pooler.supabase.com:6543/*) echo "הכתובת כבר על 6543. תכתוב לClaude 'כבר מוגדר'."; exit 0 ;;
  *) echo "הכתובת הנוכחית בצורה לא צפויה. לא שיניתי כלום. תכתוב לClaude 'נכשל'."; exit 1 ;;
esac

BASE="${CUR%%\?*}"
NEW="${BASE/pooler.supabase.com:5432\//pooler.supabase.com:6543/}"

echo "בודק את החיבור החדש…"
if ! ERR=$(psql "$NEW" -Atc "select 1" 2>&1 >/dev/null); then
  echo "החיבור החדש לא עבד. לא שיניתי כלום. הסיבה:"
  printf '%s\n' "$ERR" | sed -E 's#postgres(ql)?://[^ ]*#[כתובת]#g' | head -2
  exit 1
fi

FINAL="${NEW}?pgbouncer=true&connection_limit=1"
vercel env rm DATABASE_URL production -y >/dev/null 2>&1 || true
if ! printf "%s" "$FINAL" | vercel env add DATABASE_URL production --sensitive --yes >/dev/null; then
  # Put the old value back so the next deployment still has a database.
  printf "%s" "$CUR" | vercel env add DATABASE_URL production --sensitive --yes >/dev/null 2>&1 || true
  echo "השמירה ב-Vercel נכשלה, והחזרתי את הכתובת הקודמת. האתר שרץ עכשיו לא השתנה. תכתוב לClaude 'נכשל'."
  exit 1
fi
echo "בוצע: הפרודקשן מתחבר עכשיו דרך Transaction pooler."
echo "תכתוב לClaude 'סיים', והוא יעלה את האתר מחדש ויבדוק אותו."
