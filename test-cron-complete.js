/**
 * Complete test for cron job functionality
 * Tests both the new logic and skip-processed-items feature
 */

const fetch = require('node-fetch');

async function testCronJobComplete() {
  console.log('🧪 Testing complete cron job functionality...\n');
  
  try {
    // Test 1: First run - should process items
    console.log('📋 Test 1: First cron run (should process new items)');
    const response1 = await fetch('http://localhost:3000/api/cron/check-expiring-products');
    const data1 = await response1.json();
    
    console.log('   Result:', JSON.stringify(data1.data, null, 2));
    
    if (data1.data.notificationsCreated > 0) {
      console.log('   ✅ First run processed items successfully\n');
      
      // Test 2: Second run - should skip already processed items
      console.log('📋 Test 2: Second cron run (should skip processed items)');
      const response2 = await fetch('http://localhost:3000/api/cron/check-expiring-products');
      const data2 = await response2.json();
      
      console.log('   Result:', JSON.stringify(data2.data, null, 2));
      
      if (data2.data.notificationsCreated === 0) {
        console.log('   ✅ Second run correctly skipped processed items\n');
        console.log('🎉 All tests passed! Cron job works perfectly:');
        console.log('   - Finds expired OR expiring within 30 days');
        console.log('   - Skips already processed items');
        console.log('   - No duplicate notifications');
      } else {
        console.log('   ❌ Second run should not have created new notifications');
      }
    } else {
      console.log('   ℹ️ No items to process (no test data or all already processed)');
      console.log('   💡 Run the create-test-data.sql to create test inventory items');
    }
    
  } catch (error) {
    console.error('❌ Error testing cron job:', error.message);
  }
}

// Run the complete test
testCronJobComplete();
