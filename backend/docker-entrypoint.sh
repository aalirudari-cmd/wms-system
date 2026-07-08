#!/bin/sh
set -e

# Apply pending Prisma migrations, then seed reference data (idempotent — the
# seed upserts permissions/roles and only creates the admin/demo data if
# absent). Both are safe to run on every container start.
echo "Running database migrations…"
npx prisma migrate deploy

echo "Seeding reference data…"
npx tsx prisma/seed.ts

echo "Starting API server…"
exec node dist/server.js
