/**
 * Standalone Cron Job Script
 * 
 * This script can be run directly or scheduled with any cron system.
 * 
 * Usage:
 *   - Direct: npm run cron:expiring-products
 *   - With ts-node: ts-node src/scripts/runExpiringProductsCheck.ts
 *   - Scheduled: Add to your system cron or task scheduler
 */

import dotenv from 'dotenv';
import { checkExpiringProductsAndNotify } from '../services/notificationCronService';

// Load environment variables
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

/**
 * Main function to run the expiring products check
 */
async function main() {
  console.log('🚀 Starting Expiring Products Check Cron Job...');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
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
    
    // Exit with success code
    process.exit(0);
  } catch (error: any) {
    console.error('='.repeat(60));
    console.error('❌ Cron Job Failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`⏰ Failed at: ${new Date().toISOString()}`);
    
    // Exit with error code
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

// Export for programmatic use
export { main as runExpiringProductsCheck };

