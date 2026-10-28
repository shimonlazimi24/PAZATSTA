#!/usr/bin/env bash
# Saves the Google login keys in Vercel. Staging (Preview) only by default;
# pass "production" to also turn the button on in production.
# The secret is pasted hidden and never printed.
set -euo pipefail
export PATH="$HOME/fixTok/node-toolchain/bin:$HOME/.local/bin:$PATH"

TARGETS=("preview")
[ "${1:-}" = "production" ] && TARGETS+=("production")

read -r -p "הדבק את ה-Client ID (נגמר ב-apps.googleusercontent.com): " CID
CID="$(printf '%s' "$CID" | tr -d '[:space:]')"
case "$CID" in
  *.apps.googleusercontent.com) ;;
  *) echo "זה לא נראה כמו Client ID של Google. לא שיניתי כלום."; exit 1 ;;
esac
read -r -s -p "הדבק את ה-Client secret (לא יוצג): " SECRET
echo
SECRET="$(printf '%s' "$SECRET" | tr -d '[:space:]')"
if [ ${#SECRET} -lt 10 ]; then echo "ה-secret קצר מדי. לא שיניתי כלום."; exit 1; fi

for T in "${TARGETS[@]}"; do
  vercel env rm GOOGLE_CLIENT_ID "$T" -y >/dev/null 2>&1 || true
  vercel env rm GOOGLE_CLIENT_SECRET "$T" -y >/dev/null 2>&1 || true
  printf '%s' "$CID" | vercel env add GOOGLE_CLIENT_ID "$T" --yes >/dev/null
  printf '%s' "$SECRET" | vercel env add GOOGLE_CLIENT_SECRET "$T" --sensitive --yes >/dev/null
  echo "נשמר ב-Vercel עבור: $T"
done
echo "בוצע. תכתוב לClaude 'סיים', והוא יעלה מחדש ויבדוק."
