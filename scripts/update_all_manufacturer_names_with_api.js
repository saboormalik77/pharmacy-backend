#!/usr/bin/env node

/**
 * Script to update all manufacturer policies with correct names from OpenFDA API
 * 
 * Usage:
 *   node scripts/update_all_manufacturer_names_with_api.js [--limit=50] [--dry-run]
 * 
 * Options:
 *   --limit=N     Process N policies at a time (default: 50)
 *   --dry-run     Show what would be updated without making changes
 *   --help        Show this help message
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    throw new Error('ADMIN_TOKEN environment variable is required');
  }

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function updateManufacturerNames(limit = 50, dryRun = false) {
  console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Starting manufacturer name updates...`);
  console.log(`📊 Processing up to ${limit} policies`);
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No actual changes will be made');
  }
  
  try {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`\n📦 Processing batch starting at ${totalProcessed + 1}...`);
      
      if (!dryRun) {
        const result = await makeRequest('/admin/policies/update-api-names', 'POST', { limit });
        
        console.log(`✅ Batch complete:`);
        console.log(`   • Processed: ${result.data.processed}`);
        console.log(`   • Updated: ${result.data.updated}`);
        console.log(`   • Errors: ${result.data.errors.length}`);
        
        if (result.data.errors.length > 0) {
          console.log(`❌ Errors in this batch:`);
          result.data.errors.forEach(error => {
            console.log(`   • ${error.labelerId}: ${error.error}`);
          });
        }
        
        totalProcessed += result.data.processed;
        totalUpdated += result.data.updated;
        totalErrors += result.data.errors.length;
        
        // If we processed fewer than the limit, we're done
        hasMore = result.data.processed === limit;
      } else {
        // In dry run mode, just list some policies to show what would be processed
        const policies = await makeRequest(`/admin/policies?limit=${limit}&page=${Math.floor(totalProcessed / limit) + 1}`);
        
        if (policies.data && policies.data.policies && policies.data.policies.length > 0) {
          console.log(`📋 Would process ${policies.data.policies.length} policies:`);
          policies.data.policies.slice(0, 5).forEach(policy => {
            console.log(`   • ${policy.labelerId}: ${policy.manufacturerName}`);
          });
          
          if (policies.data.policies.length > 5) {
            console.log(`   ... and ${policies.data.policies.length - 5} more`);
          }
          
          totalProcessed += policies.data.policies.length;
          hasMore = policies.data.policies.length === limit;
        } else {
          hasMore = false;
        }
      }
      
      // Add delay between batches to avoid overwhelming the API
      if (hasMore) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Update complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total processed: ${totalProcessed}`);
    
    if (!dryRun) {
      console.log(`   • Total updated: ${totalUpdated}`);
      console.log(`   • Total errors: ${totalErrors}`);
      
      if (totalUpdated > 0) {
        console.log(`✅ Successfully updated ${totalUpdated} manufacturer policies with correct API names!`);
      } else {
        console.log(`ℹ️  No policies needed updating - all manufacturer names are already correct.`);
      }
    } else {
      console.log(`ℹ️  This was a dry run - no changes were made.`);
      console.log(`ℹ️  Run without --dry-run to perform actual updates.`);
    }
    
  } catch (error) {
    console.error(`❌ Error updating manufacturer names:`, error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📚 Update Manufacturer Names with API Data

This script updates manufacturer policies with correct names from OpenFDA API.

Usage:
  node scripts/update_all_manufacturer_names_with_api.js [options]

Options:
  --limit=N     Process N policies at a time (default: 50)
  --dry-run     Show what would be updated without making changes
  --help        Show this help message

Environment Variables:
  API_URL       API base URL (default: http://localhost:3000/api)
  ADMIN_TOKEN   Admin JWT token (required)

Examples:
  # Dry run to see what would be updated
  ADMIN_TOKEN=your_token node scripts/update_all_manufacturer_names_with_api.js --dry-run

  # Update 20 policies at a time
  ADMIN_TOKEN=your_token node scripts/update_all_manufacturer_names_with_api.js --limit=20

  # Update all policies (default batch size)
  ADMIN_TOKEN=your_token node scripts/update_all_manufacturer_names_with_api.js
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
  
  const dryRun = args.includes('--dry-run');
  
  if (isNaN(limit) || limit < 1) {
    console.error('❌ Invalid limit value. Must be a positive integer.');
    process.exit(1);
  }
  
  await updateManufacturerNames(limit, dryRun);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

main();