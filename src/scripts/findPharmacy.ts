#!/usr/bin/env npx ts-node

import { supabaseAdmin } from '../config/supabase';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findPharmacy() {
  if (!supabaseAdmin) {
    console.error('❌ Supabase admin client not configured');
    process.exit(1);
  }

  const { data, error } = await supabaseAdmin
    .from('pharmacy')
    .select('id, email, name, pharmacy_name')
    .eq('email', 'fenonir863@lxbeta.com')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Found pharmacy:', data);
  }
}

findPharmacy().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });