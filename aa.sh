#!/usr/bin/env bash
set -euo pipefail

SOURCE_HOST="aws-1-ap-southeast-1.pooler.supabase.com"
SOURCE_PORT="5432"
SOURCE_USER="postgres.mxdzmfgkjktbvjeonwiq"

DEST_HOST="aws-1-ap-northeast-1.pooler.supabase.com"
DEST_PORT="5432"
DEST_USER="postgres.qkktjmynqjreimeazclm"

DB_NAME="postgres"
DB_PASSWORD="Rx!Portal#9QmL7@eV2"   # same password for both

STAMP="$(date +%Y%m%d_%H%M%S)"
SCHEMA_FILE="public_schema_only_${STAMP}.sql"

echo "=== Export schema from SOURCE (public only, no rows) ==="
docker run --rm --network=host \
  -e PGPASSWORD="$DB_PASSWORD" \
  -e PGSSLMODE="require" \
  postgres:17 \
  pg_dump \
    -h "$SOURCE_HOST" -p "$SOURCE_PORT" -U "$SOURCE_USER" -d "$DB_NAME" \
    --schema-only \
    --schema=public \
    --clean \
    --if-exists \
  > "$SCHEMA_FILE"

echo "=== Import schema into DEST ==="
docker run --rm -i --network=host \
  -e PGPASSWORD="$DB_PASSWORD" \
  -e PGSSLMODE="require" \
  postgres:17 \
  psql \
    -h "$DEST_HOST" -p "$DEST_PORT" -U "$DEST_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
  < "$SCHEMA_FILE"

echo "Done. Output: $SCHEMA_FILE"