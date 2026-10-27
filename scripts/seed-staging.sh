#!/usr/bin/env bash
# Adds fictional test users to the STAGING database (never production).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/fixTok/node-toolchain/bin:$PATH"

echo "Paste the Transaction pooler connection string of pazatsta-staging (with [YOUR-PASSWORD]):"
read -r URI_TEMPLATE
case "$URI_TEMPLATE" in *wqmdjbhvonzoyhucdith*) ;; *) echo "Not the staging project. Stopping."; exit 1 ;; esac
echo "Paste the staging database password (nothing will show):"
read -rs DB_PASSWORD; echo
ENC=$(DB_PASSWORD="$DB_PASSWORD" node -e 'process.stdout.write(encodeURIComponent(process.env.DB_PASSWORD))')
URI="${URI_TEMPLATE/\[YOUR-PASSWORD\]/$ENC}"
URI="${URI%%\?*}"
read -r -p "Email you will log in to the staging admin with: " ADMIN_EMAIL

# The session pooler (5432) is reachable over IPv4 from a laptop; the transaction
# pooler (6543) the app uses may be IPv6-only from here.
DATABASE_URL="${URI/:6543\//:5432/}" SEED_ADMIN_EMAIL="$ADMIN_EMAIL" npx tsx scripts/seed-staging.ts
unset DB_PASSWORD ENC URI
