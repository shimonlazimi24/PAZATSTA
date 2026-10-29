#!/usr/bin/env bash
# Saves the 019 SMS keys in Vercel. Staging (Preview) only by default;
# pass "production" to also turn SMS on in production.
# The token is pasted hidden and never printed.
set -euo pipefail
export PATH="$HOME/fixTok/node-toolchain/bin:$HOME/.local/bin:$PATH"

TARGETS=("preview")
[ "${1:-}" = "production" ] && TARGETS+=("production")

read -r -p "שם המשתמש שלך ב-019: " USERNAME
USERNAME="$(printf '%s' "$USERNAME" | tr -d '[:space:]')"
if [ -z "$USERNAME" ]; then echo "לא הוזן שם משתמש. לא שיניתי כלום."; exit 1; fi

read -r -s -p "הדבק את ה-Token של ה-API (לא יוצג): " TOKEN
echo
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"
if [ ${#TOKEN} -lt 10 ]; then echo "ה-Token קצר מדי. לא שיניתי כלום."; exit 1; fi

read -r -p "שם השולח שיופיע בהודעה (Enter = Pazatsta): " SENDER
SENDER="$(printf '%s' "${SENDER:-Pazatsta}" | tr -d '[:space:]')"
if ! printf '%s' "$SENDER" | grep -Eq '^([A-Za-z0-9]{1,11}|0[0-9]{8,9})$'; then
  echo "שם השולח חייב להיות עד 11 אותיות באנגלית או ספרות, או מספר טלפון. לא שיניתי כלום."; exit 1
fi

for T in "${TARGETS[@]}"; do
  for V in SMS_PROVIDER SMS_019_USERNAME SMS_019_TOKEN SMS_SENDER SMS_019_TEST; do
    vercel env rm "$V" "$T" -y >/dev/null 2>&1 || true
  done
  printf '019' | vercel env add SMS_PROVIDER "$T" --yes >/dev/null
  printf '%s' "$USERNAME" | vercel env add SMS_019_USERNAME "$T" --yes >/dev/null
  printf '%s' "$TOKEN" | vercel env add SMS_019_TOKEN "$T" --sensitive --yes >/dev/null
  printf '%s' "$SENDER" | vercel env add SMS_SENDER "$T" --yes >/dev/null
  echo "נשמר ב-Vercel עבור: $T"
done
echo "בוצע. תכתוב ל-Claude 'סיים', והוא יעלה מחדש ויבדוק."
