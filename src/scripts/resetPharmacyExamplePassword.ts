#!/usr/bin/env npx ts-node

/**
 * Script to reset pharmacy@example.com password to Rx!Portal#9QmL7@eV2
 * Usage: npx ts-node src/scripts/resetPharmacyExamplePassword.ts
 */

import { supabaseAdmin } from '../config/supabase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const NEW_PASSWORD = 'Rx!Portal#9QmL7@eV2';

async function resetPharmacyExamplePassword() {
    if (!supabaseAdmin) {
        console.error('❌ Supabase admin client not configured. SUPABASE_SERVICE_ROLE_KEY is required.');
        process.exit(1);
    }

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

        // Step 2: Find the auth user by email
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Failed to list auth users:', listError.message);
            process.exit(1);
        }

        const authUser = authUsers?.users?.find((user: any) => user.email === EMAIL.toLowerCase().trim());
        
        if (!authUser) {
            console.error('❌ Auth user not found with email:', EMAIL);
            console.log('💡 This might mean the user was created in the pharmacy table but not in Supabase Auth.');
            console.log('💡 Creating auth user...');
            
            // Create auth user if it doesn't exist
            const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: EMAIL.toLowerCase().trim(),
                password: NEW_PASSWORD,
                email_confirm: true,
            });

            if (createError) {
                console.error('❌ Failed to create auth user:', createError.message);
                process.exit(1);
            }

            console.log('✅ Created new auth user:', newAuthUser?.user?.id);
            
            // Update pharmacy record to link to the new auth user
            const { error: updateError } = await supabaseAdmin
                .from('pharmacy')
                .update({ id: newAuthUser?.user?.id })
                .eq('email', EMAIL.toLowerCase().trim());

            if (updateError) {
                console.error('❌ Failed to update pharmacy record with new auth user ID:', updateError.message);
                process.exit(1);
            }

            console.log('✅ Updated pharmacy record with new auth user ID');
            console.log('✅ Password reset completed successfully!');
            console.log(`📧 Email: ${EMAIL}`);
            console.log(`🔑 New Password: ${NEW_PASSWORD}`);
            return;
        }

        console.log('✅ Found auth user:', authUser.id);

        // Step 3: Update the password using admin client
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password: NEW_PASSWORD }
        );

        if (updateError) {
            console.error('❌ Failed to update password:', updateError.message);
            process.exit(1);
        }

        console.log('✅ Password updated successfully!');

        // Step 4: Revoke all existing refresh tokens for security
        try {
            const { error: revokeError } = await supabaseAdmin
                .from('refresh_tokens')
                .delete()
                .eq('pharmacy_id', pharmacyData.id);

            if (revokeError) {
                console.warn('⚠️ Warning: Failed to revoke existing refresh tokens:', revokeError.message);
            } else {
                console.log('✅ Revoked all existing refresh tokens');
            }
        } catch (e: any) {
            console.warn('⚠️ Warning: Could not revoke refresh tokens (table may not exist):', e.message);
        }

        console.log('\n🎉 Password reset completed successfully!');
        console.log(`📧 Email: ${EMAIL}`);
        console.log(`🔑 New Password: ${NEW_PASSWORD}`);
        console.log('\n💡 The user can now login with the new password.');
        console.log('💡 All existing sessions have been invalidated for security.');

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
resetPharmacyExamplePassword()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });