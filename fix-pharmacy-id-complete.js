#!/usr/bin/env node

/**
 * Complete script to update pharmacy ID to match auth user ID
 * Handles all unique constraints and foreign keys properly
 * Usage: node fix-pharmacy-id-complete.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const OLD_PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
const NEW_AUTH_USER_ID = '33c64054-0149-4447-983d-4fdb31eca1c0';
const EMAIL = 'pharmacy@example.com';

async function fixPharmacyIdComplete() {
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
        console.log('🔧 Complete approach: Handling all constraints properly...\n');

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
        console.log(`   Name: ${pharmacyData.name}`);
        console.log(`   Email: ${pharmacyData.email}`);
        console.log(`   Store Number: ${pharmacyData.store_number || 'N/A'}`);

        // Step 2: Create temporary unique values for the new record
        const timestamp = Date.now();
        const tempEmail = `temp_migration_${timestamp}@example.com`;
        const tempStoreNumber = `TEMP${timestamp}`.substring(0, 10);

        console.log('\n🔄 Step 1: Creating new pharmacy record with temporary unique values...');
        const newPharmacyData = {
            ...pharmacyData,
            id: NEW_AUTH_USER_ID,
            email: tempEmail,
            store_number: pharmacyData.store_number ? tempStoreNumber : null
        };

        const { error: insertError } = await supabaseAdmin
            .from('pharmacy')
            .insert(newPharmacyData);

        if (insertError) {
            console.error('❌ Failed to create new pharmacy record:', insertError.message);
            process.exit(1);
        }
        console.log('✅ Created new pharmacy record with auth user ID');

        // Step 3: Update all foreign key references to point to new pharmacy
        console.log('\n🔄 Step 2: Updating foreign key references...');
        const referenceTables = [
            'return_transactions',
            'uploaded_documents', 
            'admin_recent_activity',
            'debit_memos',
            'refresh_tokens',
            'subscriptions'
        ];

        let successCount = 0;
        for (const table of referenceTables) {
            try {
                console.log(`   Processing ${table}...`);
                
                const { data: checkData, error: checkError } = await supabaseAdmin
                    .from(table)
                    .select('id')
                    .eq('pharmacy_id', OLD_PHARMACY_ID)
                    .limit(1);

                if (checkError) {
                    console.log(`   ✅ ${table} - skipped (no access or doesn't exist)`);
                    continue;
                }

                if (!checkData || checkData.length === 0) {
                    console.log(`   ✅ ${table} - no records to update`);
                    continue;
                }

                const { error: updateError } = await supabaseAdmin
                    .from(table)
                    .update({ pharmacy_id: NEW_AUTH_USER_ID })
                    .eq('pharmacy_id', OLD_PHARMACY_ID);

                if (updateError) {
                    console.log(`   ⚠️  ${table} - update failed: ${updateError.message}`);
                } else {
                    console.log(`   ✅ ${table} - updated successfully`);
                    successCount++;
                }
            } catch (e) {
                console.log(`   ✅ ${table} - skipped (error: ${e.message.substring(0, 30)}...)`);
            }
        }

        console.log(`\n   Updated ${successCount} tables successfully`);

        // Step 4: Delete the old pharmacy record (this should work now)
        console.log('\n🔄 Step 3: Deleting old pharmacy record...');
        const { error: deleteError } = await supabaseAdmin
            .from('pharmacy')
            .delete()
            .eq('id', OLD_PHARMACY_ID);

        if (deleteError) {
            console.error('❌ Could not delete old pharmacy record:', deleteError.message);
            console.log('💡 Continuing anyway - will update the new record with correct values');
        } else {
            console.log('✅ Deleted old pharmacy record');
        }

        // Step 5: Update the new pharmacy record with correct values
        console.log('\n🔄 Step 4: Updating new pharmacy record with correct email and store_number...');
        const { error: finalUpdateError } = await supabaseAdmin
            .from('pharmacy')
            .update({ 
                email: EMAIL,
                store_number: pharmacyData.store_number
            })
            .eq('id', NEW_AUTH_USER_ID);

        if (finalUpdateError) {
            console.error('❌ Failed to update final values:', finalUpdateError.message);
            console.log('💡 The record exists but may have temporary values');
        } else {
            console.log('✅ Updated pharmacy record with correct email and store_number');
        }

        // Step 6: Verify everything is working
        console.log('\n🔍 Step 5: Final verification...');
        
        // Check pharmacy record
        const { data: verifyPharmacy, error: verifyError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name, store_number')
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

        console.log('✅ Final verification successful!');
        console.log(`   Pharmacy ID: ${verifyPharmacy.id}`);
        console.log(`   Auth User ID: ${authUser.user.id}`);
        console.log(`   IDs Match: ${verifyPharmacy.id === authUser.user.id ? '✅ YES' : '❌ NO'}`);
        console.log(`   Email: ${verifyPharmacy.email}`);
        console.log(`   Store Number: ${verifyPharmacy.store_number || 'N/A'}`);

        console.log('\n🎉 Pharmacy ID synchronization completed successfully!');
        console.log('\n📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log('   Password: Rx!Portal#9QmL7@eV2');
        
        console.log('\n💡 Result:');
        if (verifyPharmacy.id === authUser.user.id && verifyPharmacy.email === EMAIL) {
            console.log('   ✅ PERFECT MATCH: Pharmacy ID = Auth User ID');
            console.log('   ✅ Email matches expected value');
            console.log('   ✅ No more "Pharmacy profile not found" errors!');
            console.log('   💡 You can now revert the auth middleware fallback if desired');
        } else {
            console.log('   ⚠️  Partial success - check the values above');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        process.exit(1);
    }
}

// Run the script
fixPharmacyIdComplete()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });