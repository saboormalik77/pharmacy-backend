import { supabase } from '../src/config/supabase';
import fs from 'fs';
import path from 'path';

const removeTbdCheck = async () => {
  console.log('Removing TBD status check from finalize_return_transaction function...');
  
  const sqlPath = path.join(__dirname, 'remove_tbd_finalize_check.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // If RPC fails, try using the raw query method
      console.log('RPC method failed, trying raw query...');
      const { error: queryError } = await (supabase as any).query(sql);
      
      if (queryError) {
        throw queryError;
      }
    }

    console.log('✅ TBD status check removed successfully from finalize_return_transaction!');
    console.log('The function now allows finalization of returns with TBD items.');
    
  } catch (error: any) {
    console.error('❌ Error updating function:', error?.message || error);
    console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
};

removeTbdCheck()
  .then(() => {
    console.log('Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });