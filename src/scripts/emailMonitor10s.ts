#!/usr/bin/env ts-node

/**
 * Email Monitor - 10 Second Intervals
 * 
 * This script calls the Supabase Edge Function 'read-ra-emails' every 10 seconds
 * to monitor for incoming RA responses from manufacturers.
 * 
 * Usage:
 *   npm run email-monitor:10s
 *   
 * Features:
 * - 10-second monitoring intervals (faster than pg_cron's 1-minute minimum)
 * - Real-time console feedback
 * - Graceful shutdown on Ctrl+C
 * - Error handling and retry logic
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Configuration
const EDGE_FUNCTION_URL = 'https://mxdzmfgkjktbvjeonwiq.supabase.co/functions/v1/read-ra-emails';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHptZmdramt0YnZqZW9ud2lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU0MTMwMSwiZXhwIjoyMDc5MTE3MzAxfQ.JoQDOPgEN0J81ZiS55wa-hbTev9LVM0vPvLqFtEhQ7A';
const CHECK_INTERVAL = 10 * 1000; // 10 seconds

interface EmailCheckResponse {
  success: boolean;
  processed: number;
  newRAs: number;
  errors: string[];
  summary: string;
}

async function checkEmails(): Promise<EmailCheckResponse | null> {
  const timestamp = new Date().toLocaleTimeString();
  
  try {
    console.log(`[${timestamp}] 📧 Checking for new emails...`);
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxEmails: 50,
        markAsRead: true, // Mark emails as read after processing
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: EmailCheckResponse = await response.json();
    
    if (result.processed > 0) {
      console.log(`[${timestamp}] ✅ Processed ${result.processed} emails`);
      if (result.newRAs > 0) {
        console.log(`[${timestamp}] 🎯 Found ${result.newRAs} new RA numbers!`);
      }
    } else {
      console.log(`[${timestamp}] 💤 No new emails`);
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`[${timestamp}] ⚠️  Errors: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Error checking emails:`, error.message);
    return null;
  }
}

async function startMonitoring() {
  console.log('🚀 Starting email monitor (10-second intervals)');
  console.log(`📧 Monitoring: ${EDGE_FUNCTION_URL}`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log('Press Ctrl+C to stop\n');

  // Initial check
  await checkEmails();

  // Set up interval
  const intervalId = setInterval(async () => {
    await checkEmails();
  }, CHECK_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping email monitor...');
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping email monitor...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start monitoring if this script is run directly
if (require.main === module) {
  startMonitoring().catch((error) => {
    console.error('❌ Failed to start email monitor:', error);
    process.exit(1);
  });
}

export { checkEmails, startMonitoring };