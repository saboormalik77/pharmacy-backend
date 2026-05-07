import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const sqlFilePath = path.join(__dirname, 'get_historical_earnings_function.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('🚀 Running SQL migration for get_historical_earnings function...\n');
  console.log('SQL to execute:');
  console.log('================');
  console.log(sql);
  console.log('================\n');

  // Execute the SQL using Supabase's rpc for raw SQL
  // Note: This requires the function to already exist or using Supabase Dashboard
  // For creating new functions, use Supabase Dashboard SQL Editor
  
  console.log('⚠️  To create this function, please:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Paste and run the SQL from: scripts/get_historical_earnings_function.sql');
  console.log('\nAlternatively, use the Supabase CLI with proper authentication.');
}

runMigration().catch(console.error);

