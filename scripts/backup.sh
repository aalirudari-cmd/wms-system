#!/usr/bin/env bash
# Dump the Postgres database to backups/ (gzipped) and keep the latest 14.
# Schedule nightly with cron, e.g.:
#   0 2 * * * /opt/wms/scripts/backup.sh >> /var/log/wms-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env so POSTGRES_USER/DB match the running container.
set -a
[ -f .env ] && . ./.env
set +a

mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
out="backups/wms-${stamp}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-wms}" "${POSTGRES_DB:-wms}" | gzip > "$out"

# Retain the 14 most recent backups.
ls -1t backups/wms-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Backup written: $out"
