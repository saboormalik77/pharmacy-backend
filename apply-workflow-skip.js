#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import Supabase client from existing config
const { createClient } = require('@supabase/supabase-js');

// Try to load environment variables
require('dotenv').config({ path: '.env.local' });

async function applyFix() {
  console.log('🔧 Skipping post-closeout workflow and cleaning up batch...\n');

  try {
    // Create Supabase client using existing config pattern
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the SQL fix file
    const sqlFile = path.join(__dirname, 'scripts', 'fcr_55_skip_post_closeout_workflow.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Loaded SQL fix from:', sqlFile);
    console.log('🔗 Connecting to Supabase...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlContent.replace(/^--.*$/gm, '').trim() // Remove comments 
    });

    if (error) {
      console.error('❌ Error executing SQL via RPC:', error);
      console.log('\n⚠️  RPC method not available. Please run this SQL manually in Supabase SQL Editor:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(sqlContent);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    console.log('✅ Post-closeout workflow cleanup completed successfully!');
    console.log('\n🎯 The cleanup accomplished:');
    console.log('   • Deleted $0.00 debit memos for non-returnable items');
    console.log('   • Reset Cardinal workflow flags (file_generated, submitted_at, etc.)');
    console.log('   • Updated batch totals to reflect only returnable items');
    console.log('   • Moved batch back to closeout form state');
    console.log('\n📝 Specific changes:');
    console.log('   • Removed DM-0428-0002 ($0.00 memo)'); 
    console.log('   • Kept DM-0428-0001 ($20.00 memo)');
    console.log('   • Reset workflow to allow normal closeout process');
    console.log('\n🔄 The batch should now show in the normal closeout interface.');

  } catch (error) {
    console.error('❌ Failed to apply cleanup:', error.message);
    
    console.log('\n📝 Manual Application Required:');
    console.log('Please run the following file in your Supabase SQL Editor:');
    console.log('   scripts/fcr_55_skip_post_closeout_workflow.sql');
  }
}

applyFix();