#!/usr/bin/env node

/**
 * Script to fix UUID mismatch between pharmacy record and auth user
 * This will update the pharmacy.id to match the auth user ID
 * Usage: node fix-pharmacy-uuid-mismatch.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
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
        console.log('🔧 Fixing UUID mismatch between pharmacy and auth user...\n');

        // Step 1: Verify the current state
        console.log('📋 Current State:');
        console.log(`   Pharmacy ID: ${PHARMACY_ID}`);
        console.log(`   Auth User ID: ${AUTH_USER_ID}`);
        console.log(`   Email: ${EMAIL}\n`);

        // Step 2: Check what tables reference the pharmacy ID (to handle foreign key constraints)
        console.log('🔍 Checking for foreign key constraints...');
        
        // Check admin_recent_activity
        const { data: activityData, error: activityError } = await supabaseAdmin
            .from('admin_recent_activity')
            .select('id')
            .eq('pharmacy_id', PHARMACY_ID)
            .limit(1);

        if (activityError) {
            console.log('   ✅ admin_recent_activity table check skipped (may not exist)');
        } else if (activityData && activityData.length > 0) {
            console.log('   ⚠️  Found references in admin_recent_activity - will update these first');
            
            // Update foreign key references to use the new ID
            const { error: updateActivityError } = await supabaseAdmin
                .from('admin_recent_activity')
                .update({ pharmacy_id: AUTH_USER_ID })
                .eq('pharmacy_id', PHARMACY_ID);

            if (updateActivityError) {
                console.error('❌ Failed to update admin_recent_activity:', updateActivityError.message);
                process.exit(1);
            }
            console.log('   ✅ Updated admin_recent_activity references');
        } else {
            console.log('   ✅ No admin_recent_activity references found');
        }

        // Check other potential tables that might reference pharmacy_id
        const tablesToCheck = [
            'return_transactions',
            'notifications', 
            'subscriptions',
            'uploaded_documents',
            'inventory_items',
            'returns',
            'marketplace_listings',
            'orders',
            'warehouse_packages',
            'warehouse_orders',
            'refresh_tokens'
        ];

        for (const table of tablesToCheck) {
            try {
                const { data: refData, error: refError } = await supabaseAdmin
                    .from(table)
                    .select('id')
                    .eq('pharmacy_id', PHARMACY_ID)
                    .limit(1);

                if (!refError && refData && refData.length > 0) {
                    console.log(`   ⚠️  Found references in ${table} - updating...`);
                    
                    const { error: updateRefError } = await supabaseAdmin
                        .from(table)
                        .update({ pharmacy_id: AUTH_USER_ID })
                        .eq('pharmacy_id', PHARMACY_ID);

                    if (updateRefError) {
                        console.error(`❌ Failed to update ${table}:`, updateRefError.message);
                        // Continue with other tables
                    } else {
                        console.log(`   ✅ Updated ${table} references`);
                    }
                } else {
                    console.log(`   ✅ No ${table} references found`);
                }
            } catch (e) {
                console.log(`   ✅ ${table} table check skipped (may not exist)`);
            }
        }

        // Step 3: Now update the pharmacy record itself
        console.log('\n🔄 Updating pharmacy record ID...');
        
        // First, get all the pharmacy data
        const { data: pharmacyData, error: getPharmacyError } = await supabaseAdmin
            .from('pharmacy')
            .select('*')
            .eq('id', PHARMACY_ID)
            .single();

        if (getPharmacyError || !pharmacyData) {
            console.error('❌ Failed to get pharmacy data:', getPharmacyError?.message);
            process.exit(1);
        }

        // Delete the old record
        const { error: deleteError } = await supabaseAdmin
            .from('pharmacy')
            .delete()
            .eq('id', PHARMACY_ID);

        if (deleteError) {
            console.error('❌ Failed to delete old pharmacy record:', deleteError.message);
            process.exit(1);
        }

        // Insert the record with the new ID
        const newPharmacyData = {
            ...pharmacyData,
            id: AUTH_USER_ID
        };

        const { error: insertError } = await supabaseAdmin
            .from('pharmacy')
            .insert(newPharmacyData);

        if (insertError) {
            console.error('❌ Failed to insert pharmacy record with new ID:', insertError.message);
            console.log('💡 Attempting to restore original record...');
            
            // Try to restore the original record
            await supabaseAdmin
                .from('pharmacy')
                .insert(pharmacyData);
                
            process.exit(1);
        }

        console.log('✅ Successfully updated pharmacy record ID');

        // Step 4: Verify the fix
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
        console.log(`   New Pharmacy ID: ${verifyData.id}`);
        console.log(`   Email: ${verifyData.email}`);
        console.log(`   Name: ${verifyData.name}`);
        console.log(`   Pharmacy: ${verifyData.pharmacy_name}`);

        // Step 5: Test auth user still exists
        const { data: authUserCheck, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(AUTH_USER_ID);
        
        if (authCheckError || !authUserCheck?.user) {
            console.error('❌ Auth user verification failed:', authCheckError?.message);
            process.exit(1);
        }

        console.log('✅ Auth user verification successful');

        console.log('\n🎉 UUID mismatch fixed successfully!');
        console.log('📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log('   Password: Rx!Portal#9QmL7@eV2');
        console.log('\n💡 The user should now be able to log in without the "Pharmacy profile not found" error');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        console.log('\n🚨 IMPORTANT: If this script failed partway through, you may need to manually restore the data');
        console.log('💡 Contact the database administrator if you need help restoring the pharmacy record');
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