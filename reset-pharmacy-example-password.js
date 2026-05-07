#!/usr/bin/env node

/**
 * Quick script to reset pharmacy@example.com password to Rx!Portal#9QmL7@eV2
 * Usage: node reset-pharmacy-example-password.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const NEW_PASSWORD = 'Rx!Portal#9QmL7@eV2';

async function resetPassword() {
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
        console.log(`🔍 Looking for pharmacy with email: ${EMAIL}`);
        
        // Step 1: Check if pharmacy exists in our database
        const { data: pharmacyData, error: pharmacyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name, status')
            .eq('email', EMAIL.toLowerCase().trim())
            .single();

        if (pharmacyError || !pharmacyData) {
            console.error('❌ Pharmacy not found in database with email:', EMAIL);
            console.error('Error:', pharmacyError?.message || 'No data returned');
            process.exit(1);
        }

        console.log('✅ Found pharmacy:');
        console.log(`   ID: ${pharmacyData.id}`);
        console.log(`   Name: ${pharmacyData.name}`);
        console.log(`   Pharmacy: ${pharmacyData.pharmacy_name}`);
        console.log(`   Email: ${pharmacyData.email}`);
        console.log(`   Status: ${pharmacyData.status}`);

        // Step 2: Try to get auth user by the pharmacy ID first (most likely scenario)
        console.log('🔍 Checking if auth user exists with pharmacy ID...');
        const { data: authUserById, error: getByIdError } = await supabaseAdmin.auth.admin.getUserById(pharmacyData.id);
        
        if (authUserById?.user && !getByIdError) {
            console.log('✅ Found auth user with pharmacy ID:', authUserById.user.id);
            console.log('📧 Current email in auth:', authUserById.user.email);
            
            // Update the existing auth user's password (and email if needed)
            const updateData = { password: NEW_PASSWORD };
            if (authUserById.user.email !== EMAIL.toLowerCase().trim()) {
                updateData.email = EMAIL.toLowerCase().trim();
                updateData.email_confirm = true;
                console.log('📧 Will also update email to match pharmacy record');
            }

            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                pharmacyData.id,
                updateData
            );

            if (updateError) {
                console.error('❌ Failed to update auth user:', updateError.message);
                process.exit(1);
            }

            console.log('✅ Password updated successfully!');
            
            // Try to revoke existing sessions
            try {
                const { error: revokeError } = await supabaseAdmin
                    .from('refresh_tokens')
                    .delete()
                    .eq('pharmacy_id', pharmacyData.id);

                if (!revokeError) {
                    console.log('✅ Revoked all existing refresh tokens');
                }
            } catch (e) {
                // Ignore if refresh_tokens table doesn't exist
            }

            console.log('\n🎉 Password reset completed successfully!');
            console.log(`📧 Email: ${EMAIL}`);
            console.log(`🔑 New Password: ${NEW_PASSWORD}`);
            console.log('\n💡 The user can now login with the new password.');
            return;
        }

        // Step 3: Fallback - search for auth user by email
        console.log('🔍 Auth user not found by ID, searching by email...');
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Failed to list auth users:', listError.message);
            process.exit(1);
        }

        const authUserByEmail = authUsers?.users?.find(user => user.email === EMAIL.toLowerCase().trim());
        
        if (authUserByEmail) {
            console.log('✅ Found auth user by email:', authUserByEmail.id);
            console.log('⚠️  WARNING: Auth user ID does not match pharmacy ID');
            console.log(`   Auth user ID: ${authUserByEmail.id}`);
            console.log(`   Pharmacy ID:  ${pharmacyData.id}`);
            console.log('💡 This indicates a data mismatch, but we can still reset the password');

            // Update the password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                authUserByEmail.id,
                { password: NEW_PASSWORD }
            );

            if (updateError) {
                console.error('❌ Failed to update password:', updateError.message);
                process.exit(1);
            }

            console.log('✅ Password updated successfully!');
            console.log('\n🎉 Password reset completed successfully!');
            console.log(`📧 Email: ${EMAIL}`);
            console.log(`🔑 New Password: ${NEW_PASSWORD}`);
            console.log('\n💡 The user can now login with the new password.');
            console.log('⚠️  Note: There is a data mismatch between pharmacy and auth user IDs');
            return;
        }

        // Step 4: No auth user exists - this is the problematic case we encountered
        console.log('❌ No auth user found by ID or email');
        console.log('💡 This indicates the pharmacy exists in the database but has no Supabase Auth user');
        console.log('💡 Due to foreign key constraints, we cannot easily fix this automatically');
        console.log('\n🔧 MANUAL FIX REQUIRED:');
        console.log('   Option 1: Delete and recreate the pharmacy record through the proper signup flow');
        console.log('   Option 2: Manually fix the data consistency in the database');
        console.log('   Option 3: Contact the database administrator');
        
        console.log(`\n📋 Pharmacy Details:`);
        console.log(`   Email: ${pharmacyData.email}`);
        console.log(`   ID: ${pharmacyData.id}`);
        console.log(`   Name: ${pharmacyData.name}`);
        console.log(`   Pharmacy: ${pharmacyData.pharmacy_name}`);

        process.exit(1);

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
resetPassword()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });