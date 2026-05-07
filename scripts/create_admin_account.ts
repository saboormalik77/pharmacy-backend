/**
 * Script to create an admin account
 * 
 * Usage:
 *   npm run create-admin <email> <password> <name>
 *   npx ts-node scripts/create_admin_account.ts <email> <password> <name>
 *   yarn create-admin <email> <password> <name>
 * 
 * Example:
 *   npm run create-admin admin@pharmadmin.com "SecurePassword123" "Admin User"
 *   npx ts-node scripts/create_admin_account.ts admin@pharmadmin.com "SecurePassword123" "Admin User"
 * 
 * Or set environment variables:
 *   ADMIN_EMAIL=admin@pharmadmin.com
 *   ADMIN_PASSWORD=SecurePassword123
 *   ADMIN_NAME="Admin User"
 *   npx ts-node scripts/create_admin_account.ts
 */

import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../src/config/supabase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SALT_ROUNDS = 10;

interface CreateAdminParams {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'super_admin';
}

async function createAdminAccount(params: CreateAdminParams): Promise<void> {
  const { email, password, name, role = 'admin' } = params;

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check if admin already exists
  const { data: existingAdmin, error: checkError } = await supabaseAdmin
    .from('admin')
    .select('id, email')
    .eq('email', email)
    .single();

  if (existingAdmin) {
    console.log(`❌ Admin with email ${email} already exists.`);
    console.log(`   To update the password, you'll need to update the admin record directly.`);
    process.exit(1);
  }

  // Hash the password
  console.log('🔐 Hashing password...');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert admin into database
  console.log('📝 Creating admin account...');
  const { data: adminData, error: insertError } = await supabaseAdmin
    .from('admin')
    .insert([
      {
        email,
        password_hash: passwordHash,
        name,
        role,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error creating admin account:', insertError);
    throw insertError;
  }

  console.log('✅ Admin account created successfully!');
  console.log('\n📋 Admin Details:');
  console.log(`   ID: ${adminData.id}`);
  console.log(`   Email: ${adminData.email}`);
  console.log(`   Name: ${adminData.name}`);
  console.log(`   Role: ${adminData.role}`);
  console.log(`   Created At: ${adminData.created_at}`);
  console.log('\n💡 You can now use these credentials to login at /api/auth/login');
}

// Main execution
async function main() {
  try {
    // Get parameters from command line args or environment variables
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    const password = process.argv[3] || process.env.ADMIN_PASSWORD;
    const name = process.argv[4] || process.env.ADMIN_NAME || 'Admin User';
    const role = (process.argv[5] || process.env.ADMIN_ROLE || 'admin') as 'admin' | 'super_admin';

    if (!email || !password) {
      console.error('❌ Error: Email and password are required');
      console.log('\nUsage:');
      console.log('  npm run create-admin <email> <password> <name> [role]');
      console.log('  npx ts-node scripts/create_admin_account.ts <email> <password> <name> [role]');
      console.log('\nOr set environment variables:');
      console.log('  ADMIN_EMAIL=admin@pharmadmin.com');
      console.log('  ADMIN_PASSWORD=SecurePassword123');
      console.log('  ADMIN_NAME="Admin User"');
      console.log('  ADMIN_ROLE=admin');
      console.log('  npx ts-node scripts/create_admin_account.ts');
      process.exit(1);
    }

    await createAdminAccount({ email, password, name, role });
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to create admin account:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { createAdminAccount };
