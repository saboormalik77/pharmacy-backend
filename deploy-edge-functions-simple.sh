#!/bin/bash

# Deploy all Supabase Edge Functions (secrets already exist)
# Run with: chmod +x deploy-edge-functions-simple.sh && ./deploy-edge-functions-simple.sh

set -e

echo "🚀 Deploying Supabase Edge Functions..."
echo "ℹ️  Using existing secrets from Supabase"

# Deploy all functions
echo "📦 Deploying functions..."

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

npx supabase functions deploy send-pharmacy-invite --no-verify-jwt
npx supabase functions deploy send-branch-invite --no-verify-jwt
npx supabase functions deploy send-sub-admin-invite --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy send-ra-email-enhanced --no-verify-jwt
npx supabase functions deploy send-ra-email --no-verify-jwt
npx supabase functions deploy read-ra-emails --no-verify-jwt
npx supabase functions deploy resend-webhook --no-verify-jwt

echo "🎉 All edge functions deployed successfully!"
echo "📋 Deployed functions:"
echo "  - send-pharmacy-invite"
echo "  - send-branch-invite"
echo "  - send-sub-admin-invite"
echo "  - send-email"
echo "  - send-ra-email-enhanced"
echo "  - send-ra-email"
echo "  - read-ra-emails"
echo "  - resend-webhook"