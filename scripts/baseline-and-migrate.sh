#!/usr/bin/env bash
# Baseline an existing Neon DB (created via db push) so `prisma migrate deploy` works.
# Run from repo root with production DATABASE_URL + DIRECT_URL in .env

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1. Apply HR signatory columns (safe if already exist)"
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260521180000_hr_signatory_config/migration.sql

echo "==> 2. Mark existing migrations as applied (baseline)"
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"
  echo "    resolve --applied $name"
  npx prisma migrate resolve --applied "$name"
done

echo "==> 3. Confirm migration state"
npx prisma migrate deploy

echo "Done. Migration history is synced with Neon."
