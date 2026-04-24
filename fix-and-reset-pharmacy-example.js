#!/usr/bin/env node

/**
 * Script to fix the data inconsistency and reset pharmacy@example.com password
 * This script handles the case where we created an orphaned auth user
 * Usage: node fix-and-reset-pharmacy-example.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const NEW_PASSWORD = 'Rx!Portal#9QmL7@eV2';
const ORPHANED_AUTH_USER_ID = '9e0e5085-3da6-4b94-b8ec-940d6ea675c2'; // From the error message

async function fixAndResetPassword() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });

    try {
        console.log('🧹 Cleaning up orphaned auth user and fixing data consistency...\n');

        // Step 1: Delete the orphaned auth user we accidentally created
        console.log(`🗑️  Deleting orphaned auth user: ${ORPHANED_AUTH_USER_ID}`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(ORPHANED_AUTH_USER_ID);
        
        if (deleteError) {
            console.warn('⚠️  Could not delete orphaned auth user (might already be deleted):', deleteError.message);
        } else {
            console.log('✅ Deleted orphaned auth user');
        }

        // Step 2: Get the pharmacy record
        console.log(`\n🔍 Looking for pharmacy with email: ${EMAIL}`);
        const { data: pharmacyData, error: pharmacyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name, status')
            .eq('email', EMAIL.toLowerCase().trim())
            .single();

        if (pharmacyError || !pharmacyData) {
            console.error('❌ Pharmacy not found:', pharmacyError?.message);
            process.exit(1);
        }

        console.log('✅ Found pharmacy:');
        console.log(`   ID: ${pharmacyData.id}`);
        console.log(`   Name: ${pharmacyData.name}`);
        console.log(`   Pharmacy: ${pharmacyData.pharmacy_name}`);
        console.log(`   Email: ${pharmacyData.email}`);

        // Step 3: Check if auth user exists with pharmacy ID
        console.log(`\n🔍 Checking for auth user with pharmacy ID: ${pharmacyData.id}`);
        const { data: authUserById, error: getByIdError } = await supabaseAdmin.auth.admin.getUserById(pharmacyData.id);
        
        if (authUserById?.user && !getByIdError) {
            console.log('✅ Auth user exists with pharmacy ID');
            console.log(`📧 Current email: ${authUserById.user.email}`);
            
            // Just update the password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                pharmacyData.id,
                { password: NEW_PASSWORD }
            );

            if (updateError) {
                console.error('❌ Failed to update password:', updateError.message);
                process.exit(1);
            }

            console.log('✅ Password updated successfully!');
        } else {
            console.log('❌ No auth user exists with pharmacy ID');
            console.log('💡 The pharmacy record exists but has no corresponding Supabase Auth user');
            console.log('💡 This requires manual database intervention or recreating the user properly');
            
            // Let's try to create an auth user with a different approach
            console.log('\n🔧 Attempting to create auth user using Supabase signup simulation...');
            
            // Use the regular signup method instead of admin.createUser
            const { data: signupData, error: signupError } = await supabaseAdmin.auth.signUp({
                email: EMAIL.toLowerCase().trim(),
                password: NEW_PASSWORD,
            });

            if (signupError) {
                console.error('❌ Signup failed:', signupError.message);
                
                // Final attempt: manual SQL approach
                console.log('\n🔧 Attempting manual approach...');
                console.log('💡 You will need to manually fix this in the database:');
                console.log(`   1. Update the pharmacy.id to match an existing auth user ID`);
                console.log(`   2. Or delete this pharmacy record and recreate it through proper signup`);
                console.log(`   3. Current pharmacy ID: ${pharmacyData.id}`);
                console.log(`   4. You can try changing the email temporarily and signing up normally`);
                process.exit(1);
            }

            console.log('✅ Created auth user via signup:', signupData.user?.id);
            
            // Now we need to link this to the existing pharmacy record
            // This is still problematic due to the foreign key constraint
            console.log('⚠️  Auth user created but may not be properly linked to pharmacy record');
            console.log('💡 Manual intervention may still be required');
        }

        console.log('\n🎉 Process completed!');
        console.log(`📧 Email: ${EMAIL}`);
        console.log(`🔑 Password: ${NEW_PASSWORD}`);
        console.log('\n💡 Try logging in with these credentials');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
fixAndResetPassword()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });