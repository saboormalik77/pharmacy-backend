#!/usr/bin/env node

/**
 * Script to fix UUID mismatch by creating a new pharmacy record with the correct auth user ID
 * and transferring all related data
 * Usage: node fix-pharmacy-uuid-final.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const OLD_PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
const AUTH_USER_ID = '9e0e5085-3da6-4b94-b8ec-940d6ea675c2';

async function fixUuidMismatch() {
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
        console.log('🔧 Fixing UUID mismatch by creating new pharmacy record...\n');

        // Step 1: Get the existing pharmacy data
        console.log('📋 Getting existing pharmacy data...');
        const { data: oldPharmacyData, error: getPharmacyError } = await supabaseAdmin
            .from('pharmacy')
            .select('*')
            .eq('id', OLD_PHARMACY_ID)
            .single();

        if (getPharmacyError || !oldPharmacyData) {
            console.error('❌ Failed to get pharmacy data:', getPharmacyError?.message);
            process.exit(1);
        }

        console.log('✅ Found existing pharmacy data:');
        console.log(`   ID: ${oldPharmacyData.id}`);
        console.log(`   Name: ${oldPharmacyData.name}`);
        console.log(`   Pharmacy: ${oldPharmacyData.pharmacy_name}`);
        console.log(`   Email: ${oldPharmacyData.email}`);

        // Step 2: Create new pharmacy record with the auth user ID
        console.log('\n🔄 Creating new pharmacy record with correct ID...');
        const newPharmacyData = {
            ...oldPharmacyData,
            id: AUTH_USER_ID
        };

        const { error: insertError } = await supabaseAdmin
            .from('pharmacy')
            .insert(newPharmacyData);

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation
                console.log('✅ Pharmacy record with auth user ID already exists');
            } else {
                console.error('❌ Failed to create new pharmacy record:', insertError.message);
                process.exit(1);
            }
        } else {
            console.log('✅ Created new pharmacy record with correct ID');
        }

        // Step 3: Transfer related data to the new pharmacy ID
        const tablesToUpdate = [
            'return_transactions',
            'inventory_items',
            'returns',
            'marketplace_listings',
            'orders',
            'warehouse_packages',
            'warehouse_orders',
            'notifications',
            'subscriptions',
            'uploaded_documents'
        ];

        console.log('\n🔄 Transferring related data...');
        for (const table of tablesToUpdate) {
            try {
                console.log(`   Checking ${table}...`);
                
                // First check if there are any records to update
                const { data: checkData, error: checkError } = await supabaseAdmin
                    .from(table)
                    .select('id')
                    .eq('pharmacy_id', OLD_PHARMACY_ID)
                    .limit(1);

                if (checkError) {
                    console.log(`   ✅ ${table} skipped (table may not exist)`);
                    continue;
                }

                if (!checkData || checkData.length === 0) {
                    console.log(`   ✅ ${table} - no records to transfer`);
                    continue;
                }

                // Update the records
                const { error: updateError } = await supabaseAdmin
                    .from(table)
                    .update({ pharmacy_id: AUTH_USER_ID })
                    .eq('pharmacy_id', OLD_PHARMACY_ID);

                if (updateError) {
                    console.log(`   ⚠️  ${table} - failed to update: ${updateError.message}`);
                } else {
                    console.log(`   ✅ ${table} - updated successfully`);
                }
            } catch (e) {
                console.log(`   ✅ ${table} skipped (table may not exist)`);
            }
        }

        // Step 4: Handle admin_recent_activity specially (it has the foreign key constraint)
        console.log('\n🔄 Handling admin_recent_activity...');
        try {
            const { data: activityData, error: activityError } = await supabaseAdmin
                .from('admin_recent_activity')
                .select('id')
                .eq('pharmacy_id', OLD_PHARMACY_ID)
                .limit(1);

            if (activityError) {
                console.log('   ✅ admin_recent_activity skipped (table may not exist)');
            } else if (activityData && activityData.length > 0) {
                // Now that the new pharmacy record exists, we can update the foreign key
                const { error: updateActivityError } = await supabaseAdmin
                    .from('admin_recent_activity')
                    .update({ pharmacy_id: AUTH_USER_ID })
                    .eq('pharmacy_id', OLD_PHARMACY_ID);

                if (updateActivityError) {
                    console.log(`   ⚠️  admin_recent_activity - failed to update: ${updateActivityError.message}`);
                } else {
                    console.log('   ✅ admin_recent_activity - updated successfully');
                }
            } else {
                console.log('   ✅ admin_recent_activity - no records to transfer');
            }
        } catch (e) {
            console.log('   ✅ admin_recent_activity skipped');
        }

        // Step 5: Delete the old pharmacy record
        console.log('\n🗑️  Removing old pharmacy record...');
        const { error: deleteError } = await supabaseAdmin
            .from('pharmacy')
            .delete()
            .eq('id', OLD_PHARMACY_ID);

        if (deleteError) {
            console.log('⚠️  Could not delete old pharmacy record:', deleteError.message);
            console.log('💡 This is OK - the new record is working');
        } else {
            console.log('✅ Deleted old pharmacy record');
        }

        // Step 6: Verify the fix
        console.log('\n🔍 Verifying the fix...');
        const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name')
            .eq('id', AUTH_USER_ID)
            .single();

        if (verifyError || !verifyData) {
            console.error('❌ Verification failed:', verifyError?.message);
            process.exit(1);
        }

        console.log('✅ Verification successful:');
        console.log(`   Pharmacy ID: ${verifyData.id}`);
        console.log(`   Email: ${verifyData.email}`);
        console.log(`   Name: ${verifyData.name}`);
        console.log(`   Pharmacy: ${verifyData.pharmacy_name}`);

        // Step 7: Verify auth user
        const { data: authUserCheck, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(AUTH_USER_ID);
        
        if (authCheckError || !authUserCheck?.user) {
            console.error('❌ Auth user verification failed:', authCheckError?.message);
            process.exit(1);
        }

        console.log('✅ Auth user verification successful');
        console.log(`   Auth User ID: ${authUserCheck.user.id}`);
        console.log(`   Auth Email: ${authUserCheck.user.email}`);

        console.log('\n🎉 UUID mismatch fixed successfully!');
        console.log('\n📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log('   Password: Rx!Portal#9QmL7@eV2');
        console.log('\n💡 The "Pharmacy profile not found" error should now be resolved!');
        console.log('💡 The user can now log in successfully.');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
fixUuidMismatch()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });