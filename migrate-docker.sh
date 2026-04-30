#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Supabase Schema Migration Script
# =============================================================================
# ISSUE: Your network doesn't have IPv6 connectivity, but Supabase database 
# endpoints only resolve to IPv6 addresses.
#
# SOLUTION: Use Cloudflare WARP (free) to get IPv6 connectivity
# =============================================================================

OLD_HOST="db.mxdzmfgkjktbvjeonwiq.supabase.co"
OLD_PASSWORD="Rx!Portal#9QmL7@eV2"
NEW_HOST="db.zggtgjbokgfsbenazzpx.supabase.co"
NEW_PASSWORD="Rx!Portal#9QmL7@eV2"

STAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="full_backup_${STAMP}.sql"

# Check IPv6 connectivity
check_ipv6() {
    if ping -6 -c 1 -W 2 2606:4700:4700::1111 &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Setup WARP if needed
setup_warp() {
    echo "=== Setting up Cloudflare WARP for IPv6 connectivity ==="
    
    # Check if warp-cli is installed
    if ! command -v warp-cli &>/dev/null; then
        echo "Installing Cloudflare WARP..."
        curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
        sudo apt-get update && sudo apt-get install -y cloudflare-warp
    fi
    
    # Register and connect
    warp-cli registration new 2>/dev/null || true
    warp-cli mode warp 2>/dev/null || true
    warp-cli connect
    
    # Wait for connection
    sleep 3
    
    if check_ipv6; then
        echo "WARP connected successfully with IPv6!"
        return 0
    else
        echo "WARP connected but IPv6 still not working"
        return 1
    fi
}

# Main
echo "Checking IPv6 connectivity..."
if ! check_ipv6; then
    echo "No IPv6 connectivity detected."
    echo ""
    echo "Your options:"
    echo "1. Install Cloudflare WARP (requires sudo): ./migrate-docker.sh --setup-warp"
    echo "2. Use the Supabase Dashboard SQL Editor manually"
    echo "3. Run this script from a server with IPv6 (e.g., AWS, GCP)"
    echo ""
    
    if [[ "${1:-}" == "--setup-warp" ]]; then
        setup_warp || exit 1
    else
        echo "To proceed with WARP setup, run: ./migrate-docker.sh --setup-warp"
        exit 1
    fi
fi

echo "IPv6 connectivity confirmed!"
echo ""

echo "=== Export schema (public: tables + functions, no rows) ==="
# Use Docker with PostgreSQL 17 to match server version
# Note: Not using --clean since we drop schema separately
docker run --rm --network=host \
  -e PGPASSWORD="$OLD_PASSWORD" \
  postgres:17 \
  pg_dump \
    -h "$OLD_HOST" -p 5432 -U postgres -d postgres \
    --verbose \
    --schema-only \
    --schema=public \
    --no-owner \
    --no-acl \
  > "$SCHEMA_FILE"

echo "Schema exported to: $SCHEMA_FILE"
echo ""

echo "=== Import schema into NEW ==="
# First, drop all objects in public schema with CASCADE
echo "Dropping existing public schema objects..."
docker run --rm -i --network=host \
  -e PGPASSWORD="$NEW_PASSWORD" \
  postgres:17 \
  psql \
    -h "$NEW_HOST" -p 5432 -U postgres -d postgres \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

echo "Importing schema..."
docker run --rm -i --network=host \
  -e PGPASSWORD="$NEW_PASSWORD" \
  postgres:17 \
  psql \
    -h "$NEW_HOST" -p 5432 -U postgres -d postgres \
    -v ON_ERROR_STOP=1 -q \
  < "$SCHEMA_FILE"

echo ""
echo "Done! Schema migrated successfully."
echo "Output file: $SCHEMA_FILE"

echo "Done. Output: $SCHEMA_FILE"
