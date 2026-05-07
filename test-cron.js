/**
 * Test script for cron job
 * Run with: node test-cron.js
 */

const fetch = require('node-fetch');

async function testCronJob() {
  console.log('🧪 Testing cron job locally...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/cron/check-expiring-products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add CRON_SECRET if you have it set
        // 'Authorization': 'Bearer your-cron-secret-here'
      }
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.status === 'success') {
      console.log('\n✅ Cron job executed successfully!');
      console.log(`   - Processed pharmacies: ${data.data.processedPharmacies}`);
      console.log(`   - Notifications created: ${data.data.notificationsCreated}`);
      console.log(`   - Emails sent: ${data.data.emailsSent}`);
      
      if (data.data.errors.length > 0) {
        console.log(`   - Errors: ${data.data.errors.length}`);
        data.data.errors.forEach(error => console.log(`     ❌ ${error}`));
      }
    } else {
      console.log('\n❌ Cron job failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing cron job:', error.message);
  }
}

// Run the test
testCronJob();
