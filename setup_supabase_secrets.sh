#!/bin/bash
# ============================================================
# Push secrets to Supabase Edge Functions (project linked)
# ============================================================
#
# 1) CLI rejects secret names starting with SUPABASE_. Use EDGE_SUPABASE_URL,
#    EDGE_SUPABASE_ANON_KEY, EDGE_SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL
#    in edge-secrets.env to upload equivalents. Edge Functions use EDGE_* first,
#    then fall back to platform-injected SUPABASE_*.
#
# 2) If you see "does not have the necessary privileges": your Supabase login
#    must be a Project Owner (or role allowed to manage secrets). Ask an org
#    admin or use Dashboard → Project Settings → Edge Functions → Secrets.
#
# 3) App passwords with spaces: put them in supabase/edge-secrets.env in quotes:
#    IMAP_PASS="abcd efgh ijkl mnop"
#
# One-time CLI setup (repo root):
#   npx supabase login
#   npx supabase link --project-ref YOUR_PROJECT_REF
#
#   PROJECT_REF = the random id in your Supabase URLs, e.g.
#   - Dashboard URL:  https://supabase.com/dashboard/project/abcdefghijklmnop/...
#   - API URL:        https://abcdefghijklmnop.supabase.co  → ref is abcdefghijklmnop
#   - Settings → General → "Reference ID"
#
#   If `npx supabase init --yes` says "config.toml: file exists" — that is OK.
#   Do not use --force unless you mean to reset config. You only need `link`.
#
# Usage:
#   cp supabase/edge-secrets.env.example supabase/edge-secrets.env
#   # edit edge-secrets.env with real values
#   ./setup_supabase_secrets.sh
#   ./setup_supabase_secrets.sh --deploy   # also deploy all Edge Functions (after secrets)
#
# Or one-off:
#   npx supabase secrets set 'IMAP_PASS=abcd efgh ijkl mnop'
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT/supabase/edge-secrets.env"

echo "🔧 Supabase Edge secrets helper"
echo ""

if [[ ! -f "$ROOT/supabase/config.toml" ]]; then
  echo "❌ No supabase/config.toml"
  echo ""
  echo "From the repo root, run once:"
  echo "  npx supabase init --yes"
  echo "  npx supabase login"
  echo "  npx supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "Find YOUR_PROJECT_REF: Dashboard → your project → Settings → General → Reference ID,"
  echo "or copy it from https://YOUR_REF.supabase.co (subdomain before .supabase.co)."
  echo ""
  echo "Then run ./setup_supabase_secrets.sh again."
  exit 1
fi

# Linked project is stored in supabase/.temp/project-ref (gitignored)
if [[ ! -f "$ROOT/supabase/.temp/project-ref" ]]; then
  echo "❌ This folder is not linked to a Supabase project yet."
  echo ""
  echo "Run (paste your Reference ID immediately after --project-ref, same line):"
  echo "  cd \"$ROOT\""
  echo "  npx supabase login"
  echo "  npx supabase link --project-ref abcdefghijklmnop"
  echo ""
  echo "  (Use your real ref from Dashboard → Settings → General. \"flag needs an argument\""
  echo "   means you ran --project-ref with nothing after it.)"
  echo ""
  exit 1
fi

LINKED_REF="$(tr -d '[:space:]' < "$ROOT/supabase/.temp/project-ref")"
echo "🔗 Linked project ref: $LINKED_REF"
echo ""

echo "ℹ️  CLI cannot set secret names starting with SUPABASE_."
echo "   Use EDGE_SUPABASE_URL, EDGE_SUPABASE_ANON_KEY, EDGE_SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL"
echo "   in edge-secrets.env to upload the same values; functions prefer EDGE_* then fall back to injected SUPABASE_*."
echo ""

if [[ -f "$ENV_FILE" ]]; then
  echo "📎 Applying secrets from: supabase/edge-secrets.env"
  npx supabase secrets set --env-file "$ENV_FILE"
  echo ""
  echo "✅ Secrets are stored on Supabase for this project (not \"undeployed\" — they are live)."
  echo "   Edge Function *code* is deployed separately; functions read these env vars at runtime."
  echo ""
  echo "   Verify:  npx supabase secrets list"
  echo "   Deploy:  ./deploy-edge-functions-simple.sh"
  echo "            or:  ./setup_supabase_secrets.sh --deploy"
  echo ""

  if [[ "${1:-}" == "--deploy" ]]; then
    echo "🚀 Deploying Edge Functions..."
    cd "$ROOT"
    for fn in send-pharmacy-invite send-branch-invite send-sub-admin-invite send-email send-ra-email-enhanced \
              send-ra-email read-ra-emails resend-webhook send-service-request-notifications; do
      npx supabase functions deploy "$fn" --no-verify-jwt
    done
    echo ""
    echo "✅ Functions deployed."
  fi
  exit 0
fi

echo "❌ Missing $ENV_FILE"
echo ""
echo "Create it from the example, then run this script again:"
echo "  cp supabase/edge-secrets.env.example supabase/edge-secrets.env"
echo "  nano supabase/edge-secrets.env"
echo "  ./setup_supabase_secrets.sh"
echo ""
echo "Or set secrets in Dashboard:"
echo "  https://supabase.com/dashboard/project/_/settings/functions"
echo ""
exit 1