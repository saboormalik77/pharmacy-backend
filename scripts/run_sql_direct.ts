import { supabaseAdmin } from '../src/config/supabase';
import * as fs from 'fs';

const runSqlFile = async (filePath: string) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running SQL from ${filePath}...`);
    
    // Try to execute the SQL directly
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }
    
    const { data, error } = await supabaseAdmin
      .from('return_transaction_items')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Cannot execute SQL directly via client. Please run manually.');
      console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(sql);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('Database connection works. Please run the SQL manually in Supabase SQL editor.');
      console.log('\n⚠️  SQL to run:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(sql);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  } catch (error: any) {
    console.error('Error:', error?.message || error);
  }
};

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a SQL file path as an argument');
  process.exit(1);
}

runSqlFile(filePath);