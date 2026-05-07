#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import Supabase client from existing config
const { createClient } = require('@supabase/supabase-js');

// Try to load environment variables
require('dotenv').config({ path: '.env.local' });

async function applyFix() {
  console.log('🔧 Applying debit memo exclusion fix...\n');

  try {
    // Create Supabase client using existing config pattern
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the SQL fix file
    const sqlFile = path.join(__dirname, 'scripts', 'fcr_54_exclude_non_returnable_from_debit_memos.sql');
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

    console.log('✅ Debit memo exclusion fix applied successfully!');
    console.log('\n🎯 The fix changes debit memo generation to:');
    console.log('   • Completely exclude non-returnable items from debit memos');
    console.log('   • Only process returnable items with actual pricing');
    console.log('   • Prevent $0.00 debit memos from being created');
    console.log('\n📝 Changes applied to:');
    console.log('   • close_batch() - excludes non-returnable items');
    console.log('   • generate_debit_memos_for_batch() - excludes non-returnable items');
    console.log('\n🔄 Please refresh your debit memo generation to see the changes.');

  } catch (error) {
    console.error('❌ Failed to apply fix:', error.message);
    
    console.log('\n📝 Manual Application Required:');
    console.log('Please run the following file in your Supabase SQL Editor:');
    console.log('   scripts/fcr_54_exclude_non_returnable_from_debit_memos.sql');
  }
}

applyFix();