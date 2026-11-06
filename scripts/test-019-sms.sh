#!/usr/bin/env bash
# Sends one test SMS through 019's API from this computer, exactly as the site does.
# The token is pasted hidden and never printed. Usage: ./scripts/test-019-sms.sh
set -euo pipefail

read -r -s -p "הדבק את ה-Token של 019 (לא יוצג): " TOKEN
echo
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"
if [ ${#TOKEN} -lt 10 ]; then echo "ה-Token קצר מדי."; exit 1; fi

BODY='{"sms":{"user":{"username":"pazatsta"},"source":"Pazatsta","destinations":{"phone":[{"_":"0546839392"}]},"message":"בדיקה מהמחשב של פזצט״א"}}'

echo "שולח ל-019..."
curl -s -w '\nHTTP %{http_code}\n' -X POST https://019sms.co.il/api \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$BODY" | sed -E 's/<[^>]+>/ /g' | tr -s ' ' | head -c 800
echo
