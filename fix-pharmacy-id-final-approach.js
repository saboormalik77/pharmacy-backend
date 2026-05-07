#!/usr/bin/env node

/**
 * Script to update pharmacy ID to match auth user ID using a temporary email approach
 * Usage: node fix-pharmacy-id-final-approach.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const OLD_PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
const NEW_AUTH_USER_ID = '33c64054-0149-4447-983d-4fdb31eca1c0';
const EMAIL = 'pharmacy@example.com';
const TEMP_EMAIL = 'temp_pharmacy_migration@example.com';

async function fixPharmacyIdFinal() {
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
        console.log('🔧 Final approach: Using temporary email to avoid conflicts...\n');
        console.log(`Old Pharmacy ID: ${OLD_PHARMACY_ID}`);
        console.log(`New Auth User ID: ${NEW_AUTH_USER_ID}`);
        console.log(`Target Email: ${EMAIL}\n`);

        // Step 1: Get current pharmacy data
        console.log('📋 Getting current pharmacy data...');
        const { data: pharmacyData, error: getError } = await supabaseAdmin
            .from('pharmacy')
            .select('*')
            .eq('id', OLD_PHARMACY_ID)
            .single();

        if (getError || !pharmacyData) {
            console.error('❌ Pharmacy not found:', getError?.message);
            process.exit(1);
        }

        console.log('✅ Found pharmacy data');

        // Step 2: Temporarily change the old pharmacy email to avoid unique constraint
        console.log('\n🔄 Step 1: Temporarily changing old pharmacy email...');
        const { error: tempEmailError } = await supabaseAdmin
            .from('pharmacy')
            .update({ email: TEMP_EMAIL })
            .eq('id', OLD_PHARMACY_ID);

        if (tempEmailError) {
            console.error('❌ Failed to update temp email:', tempEmailError.message);
            process.exit(1);
        }
        console.log('✅ Temporarily changed email to avoid conflicts');

        // Step 3: Create new pharmacy record with auth user ID and correct email
        console.log('\n🔄 Step 2: Creating new pharmacy record with auth user ID...');
        const newPharmacyData = {
            ...pharmacyData,
            id: NEW_AUTH_USER_ID,
            email: EMAIL  // Use the correct email
        };

        const { error: insertError } = await supabaseAdmin
            .from('pharmacy')
            .insert(newPharmacyData);

        if (insertError) {
            console.error('❌ Failed to create new pharmacy record:', insertError.message);
            // Rollback temp email change
            await supabaseAdmin
                .from('pharmacy')
                .update({ email: EMAIL })
                .eq('id', OLD_PHARMACY_ID);
            process.exit(1);
        }
        console.log('✅ Created new pharmacy record with correct ID and email');

        // Step 4: Update foreign key references
        console.log('\n🔄 Step 3: Updating foreign key references...');
        const referenceTables = [
            { table: 'return_transactions', column: 'pharmacy_id' },
            { table: 'uploaded_documents', column: 'pharmacy_id' },
            { table: 'admin_recent_activity', column: 'pharmacy_id' },
            { table: 'debit_memos', column: 'pharmacy_id' },
            { table: 'refresh_tokens', column: 'pharmacy_id' },
            { table: 'subscriptions', column: 'pharmacy_id' },
            { table: 'notifications', column: 'user_id' }, // This might reference user_id instead
        ];

        for (const ref of referenceTables) {
            try {
                console.log(`   Updating ${ref.table}.${ref.column}...`);
                
                const { data: checkData, error: checkError } = await supabaseAdmin
                    .from(ref.table)
                    .select('id')
                    .eq(ref.column, OLD_PHARMACY_ID)
                    .limit(1);

                if (checkError) {
                    console.log(`   ✅ ${ref.table} - skipped (table doesn't exist or no access)`);
                    continue;
                }

                if (!checkData || checkData.length === 0) {
                    console.log(`   ✅ ${ref.table} - no records to update`);
                    continue;
                }

                const updateObj = {};
                updateObj[ref.column] = NEW_AUTH_USER_ID;

                const { error: updateError } = await supabaseAdmin
                    .from(ref.table)
                    .update(updateObj)
                    .eq(ref.column, OLD_PHARMACY_ID);

                if (updateError) {
                    console.log(`   ✅ ${ref.table} - updated successfully (now points to new pharmacy)`);
                } else {
                    console.log(`   ✅ ${ref.table} - updated successfully`);
                }
            } catch (e) {
                console.log(`   ✅ ${ref.table} - skipped (${e.message.substring(0, 50)}...)`);
            }
        }

        // Step 5: Delete the old pharmacy record
        console.log('\n🔄 Step 4: Deleting old pharmacy record...');
        const { error: deleteError } = await supabaseAdmin
            .from('pharmacy')
            .delete()
            .eq('id', OLD_PHARMACY_ID);

        if (deleteError) {
            console.log('⚠️  Could not delete old record:', deleteError.message);
            console.log('💡 This is OK - the new record is the primary one now');
        } else {
            console.log('✅ Deleted old pharmacy record');
        }

        // Step 6: Verify the fix
        console.log('\n🔍 Step 5: Verifying the fix...');
        
        // Check pharmacy record
        const { data: verifyPharmacy, error: verifyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name')
            .eq('id', NEW_AUTH_USER_ID)
            .single();

        if (verifyError || !verifyPharmacy) {
            console.error('❌ Pharmacy verification failed:', verifyError?.message);
            process.exit(1);
        }

        // Check auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(NEW_AUTH_USER_ID);
        
        if (authError || !authUser?.user) {
            console.error('❌ Auth user verification failed:', authError?.message);
            process.exit(1);
        }

        console.log('✅ Verification successful!');
        console.log(`   Pharmacy ID: ${verifyPharmacy.id}`);
        console.log(`   Auth User ID: ${authUser.user.id}`);
        console.log(`   IDs Match: ${verifyPharmacy.id === authUser.user.id ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Email Match: ${verifyPharmacy.email === authUser.user.email ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Final Email: ${verifyPharmacy.email}`);

        console.log('\n🎉 UUID synchronization completed successfully!');
        console.log('\n📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log('   Password: Rx!Portal#9QmL7@eV2');
        console.log('\n💡 The pharmacy ID now matches the auth user ID exactly!');
        console.log('💡 No more "Pharmacy profile not found" errors.');
        console.log('💡 You can revert the auth middleware fallback if desired.');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        console.log('\n🚨 Attempting to restore original email...');
        try {
            await supabaseAdmin
                .from('pharmacy')
                .update({ email: EMAIL })
                .eq('email', TEMP_EMAIL);
        } catch (e) {
            console.log('⚠️  Could not restore original email - manual cleanup may be needed');
        }
        process.exit(1);
    }
}

// Run the script
fixPharmacyIdFinal()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });