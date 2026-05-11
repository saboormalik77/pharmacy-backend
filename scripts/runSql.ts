import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('- SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const runSqlFile = async (sqlFilePath: string) => {
  try {
    console.log(`📄 Reading SQL file: ${sqlFilePath}`);
    const sql = fs.readFileSync(path.resolve(sqlFilePath), 'utf8');
    
    console.log('🚀 Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      throw error;
    }

    console.log('✅ SQL executed successfully!');
    if (data) {
      console.log('Result:', data);
    }
  } catch (error: any) {
    console.error('❌ Error executing SQL:', error?.message || error);
    console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
};

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: ts-node scripts/runSql.ts <path-to-sql-file>');
  process.exit(1);
}

runSqlFile(sqlFile)
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });