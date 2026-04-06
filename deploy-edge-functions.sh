#!/bin/bash

# Deploy all Supabase Edge Functions with secrets
# Run with: chmod +x deploy-edge-functions.sh && ./deploy-edge-functions.sh

set -e

echo "🚀 Deploying Supabase Edge Functions with secrets..."

# Set all secrets
echo "📝 Setting secrets..."

# Note: Replace these with your actual values from your environment
# You can get the actual values by running: supabase secrets list

supabase secrets set \
  SUPABASE_URL="$(echo $SUPABASE_URL)" \
  SUPABASE_ANON_KEY="$(echo $SUPABASE_ANON_KEY)" \
  SUPABASE_SERVICE_ROLE_KEY="$(echo $SUPABASE_SERVICE_ROLE_KEY)" \
  SUPABASE_DB_URL="$(echo $SUPABASE_DB_URL)" \
  SMTP_FROM_EMAIL="$(echo $SMTP_FROM_EMAIL)" \
  SMTP_FROM_NAME="$(echo $SMTP_FROM_NAME)" \
  REPLY_TO_EMAIL="$(echo $REPLY_TO_EMAIL)" \
  SMTP_HOST="$(echo $SMTP_HOST)" \
  SMTP_PORT="$(echo $SMTP_PORT)" \
  SMTP_SECURE="$(echo $SMTP_SECURE)" \
  SMTP_USER="$(echo $SMTP_USER)" \
  SMTP_PASS="$(echo $SMTP_PASS)" \
  IMAP_PORT="$(echo $IMAP_PORT)" \
  IMAP_USER="$(echo $IMAP_USER)" \
  IMAP_PASS="$(echo $IMAP_PASS)" \
  AZURE_OPENAI_ENDPOINT="$(echo $AZURE_OPENAI_ENDPOINT)" \
  AZURE_OPENAI_API_KEY="$(echo $AZURE_OPENAI_API_KEY)" \
  AZURE_OPENAI_DEPLOYMENT="$(echo $AZURE_OPENAI_DEPLOYMENT)" \
  AZURE_OPENAI_API_VERSION="$(echo $AZURE_OPENAI_API_VERSION)" \
  IMAP_HOST="$(echo $IMAP_HOST)" \
  PHARMACY_PORTAL_URL="$(echo $PHARMACY_PORTAL_URL)"

echo "✅ Secrets set successfully"

# Deploy all functions
echo "📦 Deploying functions..."

supabase functions deploy send-pharmacy-invite
supabase functions deploy send-branch-invite  
supabase functions deploy send-email
supabase functions deploy send-ra-email-enhanced
supabase functions deploy send-ra-email
supabase functions deploy read-ra-emails
supabase functions deploy resend-webhook

echo "🎉 All edge functions deployed successfully!"
echo "📋 Deployed functions:"
echo "  - send-pharmacy-invite"
echo "  - send-branch-invite"
echo "  - send-email"
echo "  - send-ra-email-enhanced"
echo "  - send-ra-email"
echo "  - read-ra-emails"
echo "  - resend-webhook"