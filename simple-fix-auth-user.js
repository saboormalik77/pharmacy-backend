#!/usr/bin/env node

/**
 * Simple fix: Delete the mismatched auth user and create a new one with the existing pharmacy ID
 * Usage: node simple-fix-auth-user.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const PASSWORD = 'Rx!Portal#9QmL7@eV2';
const CORRECT_PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
const WRONG_AUTH_USER_ID = '9e0e5085-3da6-4b94-b8ec-940d6ea675c2';

async function fixAuthUser() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing environment variables');
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });

    try {
        console.log('🔧 Fixing auth user mismatch...\n');

        // Step 1: Verify pharmacy exists with correct ID
        console.log('🔍 Verifying pharmacy record...');
        const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name')
            .eq('id', CORRECT_PHARMACY_ID)
            .single();

        if (pharmacyError || !pharmacy) {
            console.error('❌ Pharmacy not found:', pharmacyError?.message);
            process.exit(1);
        }

        console.log('✅ Pharmacy found:');
        console.log(`   ID: ${pharmacy.id}`);
        console.log(`   Email: ${pharmacy.email}`);
        console.log(`   Name: ${pharmacy.name}`);

        // Step 2: Delete the mismatched auth user
        console.log('\n🗑️  Deleting mismatched auth user...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(WRONG_AUTH_USER_ID);
        
        if (deleteError) {
            console.log('⚠️  Could not delete auth user (may not exist):', deleteError.message);
        } else {
            console.log('✅ Deleted mismatched auth user');
        }

        // Step 3: Check if auth user already exists with pharmacy ID
        console.log('\n🔍 Checking for existing auth user with pharmacy ID...');
        const { data: existingAuth, error: checkAuthError } = await supabaseAdmin.auth.admin.getUserById(CORRECT_PHARMACY_ID);
        
        if (existingAuth?.user) {
            console.log('✅ Auth user already exists with pharmacy ID');
            console.log(`   Auth ID: ${existingAuth.user.id}`);
            console.log(`   Auth Email: ${existingAuth.user.email}`);
            
            // Just update the password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                CORRECT_PHARMACY_ID,
                { password: PASSWORD }
            );

            if (updateError) {
                console.error('❌ Failed to update password:', updateError.message);
                process.exit(1);
            }
            
            console.log('✅ Password updated');
        } else {
            console.log('❌ No auth user exists with pharmacy ID');
            console.log('💡 This is unusual but can be fixed by creating a new auth user');
            
            // Unfortunately, we can't create an auth user with a specific ID
            // Supabase auto-generates UUIDs for auth users
            console.log('\n🔧 Creating new auth user (will have different ID)...');
            const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: EMAIL.toLowerCase().trim(),
                password: PASSWORD,
                email_confirm: true,
            });

            if (createError) {
                console.error('❌ Failed to create auth user:', createError.message);
                process.exit(1);
            }

            console.log('✅ Created new auth user:', newAuth?.user?.id);
            console.log('⚠️  WARNING: The auth user ID still won\'t match the pharmacy ID');
            console.log('💡 This will require updating your authentication logic to handle the mismatch');
        }

        console.log('\n🎉 Process completed!');
        console.log('📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log(`   Password: ${PASSWORD}`);
        console.log('\n💡 If login still fails with "Pharmacy profile not found":');
        console.log('   - The authentication middleware needs to be updated');
        console.log('   - Or the pharmacy lookup logic needs to search by email instead of ID');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
fixAuthUser()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });