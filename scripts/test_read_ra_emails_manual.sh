#!/bin/bash
# Manual test of read-ra-emails function
# Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running

PROJECT_REF="zggtgjbokgfsbenazzpx"  # e.g. zggtgjbokgfsbenazzpx
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3RnamJva2dmc2JlbmF6enB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM4NCwiZXhwIjoyMDkwNzk4Mzg0fQ.VEuwxNr5OUTE5WnH9APUB2K0ivS611eccff8LZhBdSU"

echo "🧪 Testing read-ra-emails function manually..."
echo "Mailbox = IMAP_USER secret on the Edge Function (e.g. younas@hivve.org)."
echo "After deploy, check logs for: [read-ra-emails] IMAP login: user=..."
echo

curl -s -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/read-ra-emails" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"maxEmails": 10, "markAsRead": false}' | jq '.'

echo
echo "✅ Check the response above for:"
echo "  - success: true (function ran without errors)"
echo "  - processed: N (how many emails were examined)"
echo "  - updated: N (how many RA numbers were extracted and saved)"
echo "  - results: [...] (details of each email processed)"
echo
echo "Common results:"
echo "  - processed: 0 → No unread emails in inbox"
echo "  - status: 'no_memo_found' → Emails don't contain DM-XXXX-XXXX"
echo "  - status: 'memo_not_in_db' → Email has DM-XXXX-XXXX but not in your DB"
echo "  - status: 'matched' → Found RA number and updated the memo"