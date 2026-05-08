// Detailed test for main admin login debugging
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const email = 'mainadmin@pharmadmin.com';
const password = 'MainAdmin123!';

console.log('=== Main Admin Login Debug ===');
console.log('Email:', email);
console.log('Password:', password);

// Test 1: Check environment variables
console.log('\n=== Environment Check ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Test 2: Direct database check
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('\n=== Database Direct Check ===');
  
  try {
    // Check if user exists in table
    const { data: users, error: userError } = await supabase
      .from('main_admin')
      .select('*')
      .eq('email', email);
    
    if (userError) {
      console.log('❌ Error querying main_admin table:', userError.message);
      return;
    }
    
    console.log('Users found:', users?.length || 0);
    if (users && users.length > 0) {
      const user = users[0];
      console.log('User data:', {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        hash_length: user.password_hash?.length
      });
      
      // Test password
      const isValid = bcrypt.compareSync(password, user.password_hash);
      console.log('Password valid:', isValid);
    } else {
      console.log('❌ No user found with email:', email);
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
  }
}

// Test 3: RPC function check
async function testRPC() {
  console.log('\n=== RPC Function Check ===');
  
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_main_admin_by_email', { p_email: email });
    
    if (rpcError) {
      console.log('❌ RPC Error:', rpcError.message);
      return;
    }
    
    console.log('RPC Result:', JSON.stringify(rpcResult, null, 2));
    
    if (rpcResult?.admin) {
      const adminData = rpcResult.admin;
      const isValid = bcrypt.compareSync(password, adminData.password_hash);
      console.log('Password valid via RPC:', isValid);
    }
  } catch (error) {
    console.log('❌ RPC error:', error.message);
  }
}

// Test 4: API endpoint check
async function testAPI() {
  console.log('\n=== API Endpoint Check ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/main-admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('API Status:', response.status);
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ API Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testDatabase();
  await testRPC();
  await testAPI();
}

runTests().catch(console.error);