#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Restore New Database from Supabase Backup
# =============================================================================
# Project: zggtgjbokgfsbenazzpx (NEW database)
# =============================================================================

NEW_PROJECT_REF="zggtgjbokgfsbenazzpx"

echo "=============================================="
echo "  RESTORE NEW DATABASE FROM SUPABASE BACKUP"
echo "=============================================="
echo ""
echo "Your new database project: $NEW_PROJECT_REF"
echo ""
echo "Supabase keeps automatic daily backups (Point-in-Time Recovery)."
echo ""
echo "To restore your deleted data, follow these steps:"
echo ""
echo "1. Go to the Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/$NEW_PROJECT_REF/backups/pitr"
echo ""
echo "2. In the 'Point in Time Recovery' section:"
echo "   - Select a date/time BEFORE the data was deleted"
echo "   - Click 'Start restore'"
echo ""
echo "3. If PITR is not available, check 'Scheduled backups':"
echo "   https://supabase.com/dashboard/project/$NEW_PROJECT_REF/backups/scheduled"
echo "   - Download the most recent backup before deletion"
echo "   - Restore it manually"
echo ""
echo "=============================================="
echo "  IMPORTANT: Act quickly!"
echo "=============================================="
echo "- Supabase Pro plan: 7 days of PITR"
echo "- Supabase Free plan: Daily backups (limited)"
echo ""
echo "Opening Supabase backup page in browser..."

# Try to open the browser
if command -v xdg-open &>/dev/null; then
    xdg-open "https://supabase.com/dashboard/project/$NEW_PROJECT_REF/backups/pitr" 2>/dev/null || true
elif command -v open &>/dev/null; then
    open "https://supabase.com/dashboard/project/$NEW_PROJECT_REF/backups/pitr" 2>/dev/null || true
fi

echo ""
echo "If the browser didn't open, manually visit:"
echo "https://supabase.com/dashboard/project/$NEW_PROJECT_REF/backups/pitr"
