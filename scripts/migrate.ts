import { supabase } from '../src/config/supabase';

const createPharmacyTable = async () => {
  console.log('Creating pharmacy table with Supabase Auth integration...');
  console.log('Note: This script uses RPC which may not be available.');
  console.log('Please run the SQL from pharmacy_table.sql manually in your Supabase SQL editor.\n');

  // Note: Supabase RPC exec_sql might not be available by default
  // It's recommended to run the SQL manually in Supabase SQL Editor
  const sql = `
    CREATE TABLE IF NOT EXISTS pharmacy (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      pharmacy_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON pharmacy(email);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      throw error;
    }

    console.log('Pharmacy table created successfully!');
  } catch (error: any) {
    console.error('Error creating table via RPC:', error?.message || error);
    console.log('\n⚠️  Please run this SQL manually in your Supabase SQL editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAfter creating the table, also run rls_policies.sql to set up Row-Level Security.');
    process.exit(1);
  }
};

createPharmacyTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

