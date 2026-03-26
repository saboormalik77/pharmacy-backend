#!/bin/bash

# ============================================================
# Setup Supabase Secrets for Email Processing
# ============================================================

echo "🔧 Setting up Supabase secrets for email processing..."
echo ""
echo "⚠️  This script will set up Supabase secrets. You'll need to provide sensitive values manually."
echo ""

# IMAP Configuration (for reading emails)
echo "📧 Setting IMAP configuration..."
npx supabase secrets set IMAP_HOST=imap.gmail.com
npx supabase secrets set IMAP_PORT=993
npx supabase secrets set IMAP_USER=saboor@hivve.org

# SMTP Configuration (for sending emails)
echo "📤 Setting SMTP configuration..."
npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_SECURE=false
npx supabase secrets set SMTP_USER=saboor@hivve.org
npx supabase secrets set SMTP_FROM_EMAIL=saboor@hivve.org
npx supabase secrets set SMTP_FROM_NAME="Returns Department"

# Email Configuration
echo "✉️  Setting email configuration..."
npx supabase secrets set FROM_EMAIL=onboarding@resend.dev
npx supabase secrets set REPLY_TO_EMAIL=saboor@hivve.org
npx supabase secrets set CONTACT_NAME="Returns Department"
npx supabase secrets set CONTACT_EMAIL=saboor.malik772222@gmail.com
npx supabase secrets set CONTACT_PHONE=""

# Azure OpenAI Configuration
echo "🤖 Setting Azure OpenAI configuration..."
npx supabase secrets set AZURE_OPENAI_ENDPOINT=https://hivve.openai.azure.com/
npx supabase secrets set AZURE_OPENAI_DEPLOYMENT=gpt-4.1
npx supabase secrets set AZURE_OPENAI_API_VERSION=2025-01-01-preview

echo ""
echo "✅ Basic Supabase secrets configuration complete!"
echo ""
echo "🔐 IMPORTANT: You must set these sensitive secrets manually:"
echo ""
echo "1. Gmail App Password (IMAP & SMTP):"
echo "   npx supabase secrets set IMAP_PASS=your_16_character_app_password"
echo "   npx supabase secrets set SMTP_PASS=your_16_character_app_password"
echo ""
echo "2. Azure OpenAI API Key:"
echo "   npx supabase secrets set AZURE_OPENAI_API_KEY=your_azure_openai_key"
echo ""
echo "3. Resend API Key:"
echo "   npx supabase secrets set RESEND_API_KEY=your_resend_api_key"
echo ""
echo "🔄 After setting secrets, deploy the Edge Functions:"
echo "   npx supabase functions deploy send-email"
echo "   npx supabase functions deploy send-ra-email"
echo "   npx supabase functions deploy send-ra-email-enhanced"
echo ""
echo "📧 Then test the email system!"
echo ""