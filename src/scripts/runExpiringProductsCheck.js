/**
 * Standalone Cron Job Script (JavaScript version)
 * 
 * This script can be run directly with Node.js without TypeScript compilation.
 * 
 * Usage:
 *   - Direct: node src/scripts/runExpiringProductsCheck.js
 *   - Scheduled: Add to your system cron or task scheduler
 * 
 * Example cron schedule (every 10 minutes):
 *   */10 * * * * cd /path/to/project && node src/scripts/runExpiringProductsCheck.js
 */

require('dotenv').config({ path: '.env.local' });

// Import the service (need to use compiled version or require with ts-node)
async function runCronJob() {
  try {
    // Dynamic import for ES modules or use require for compiled JS
    const { checkExpiringProductsAndNotify } = require('../services/notificationCronService');
    
    console.log('🚀 Starting Expiring Products Check Cron Job...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    const result = await checkExpiringProductsAndNotify();

    console.log('='.repeat(60));
    console.log('✅ Cron Job Completed Successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Processed pharmacies: ${result.processedPharmacies}`);
    console.log(`   - Notifications created: ${result.notificationsCreated}`);
    console.log(`   - Emails sent: ${result.emailsSent}`);
    
    if (result.errors.length > 0) {
      console.log(`   - Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`     ⚠️ ${error}`));
    }

    console.log(`⏰ Completed at: ${new Date().toISOString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ Cron Job Failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`⏰ Failed at: ${new Date().toISOString()}`);
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCronJob();
}

module.exports = { runCronJob };

