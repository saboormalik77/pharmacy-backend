import { supabase } from '../src/config/supabase';
import * as fs from 'fs';
import * as path from 'path';

const runSqlFile = async (filePath: string) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running SQL from ${filePath}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log('SQL executed successfully!');
  } catch (error: any) {
    console.error('Error executing SQL:', error?.message || error);
    console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
};

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a SQL file path as an argument');
  process.exit(1);
}

runSqlFile(filePath)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });