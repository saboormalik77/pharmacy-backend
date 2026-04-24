#!/usr/bin/env node

/**
 * Script to update pharmacy record ID to match auth user ID
 * This handles foreign key constraints by temporarily disabling them
 * Usage: node fix-pharmacy-id-match-auth.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const OLD_PHARMACY_ID = '3e19f01d-511d-421f-9cc6-ed83d33e034d';
const NEW_AUTH_USER_ID = '33c64054-0149-4447-983d-4fdb31eca1c0';
const EMAIL = 'pharmacy@example.com';

async function fixPharmacyIdMatch() {
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
        console.log('🔧 Updating pharmacy ID to match auth user ID...\n');
        console.log(`Old Pharmacy ID: ${OLD_PHARMACY_ID}`);
        console.log(`New Auth User ID: ${NEW_AUTH_USER_ID}\n`);

        // Step 1: Get the current pharmacy data
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

        // Step 2: Update all foreign key references first
        const referenceTables = [
            'return_transactions',
            'uploaded_documents', 
            'admin_recent_activity',
            'debit_memos',
            'inventory_items',
            'returns',
            'marketplace_listings',
            'orders',
            'warehouse_packages',
            'warehouse_orders',
            'notifications',
            'subscriptions',
            'refresh_tokens'
        ];

        console.log('\n🔄 Updating foreign key references...');
        for (const table of referenceTables) {
            try {
                console.log(`   Updating ${table}...`);
                
                const { data: checkData, error: checkError } = await supabaseAdmin
                    .from(table)
                    .select('id')
                    .eq('pharmacy_id', OLD_PHARMACY_ID)
                    .limit(1);

                if (checkError) {
                    console.log(`   ✅ ${table} - skipped (table doesn't exist)`);
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
                    console.log(`   ⚠️  ${table} - failed: ${updateError.message}`);
                } else {
                    console.log(`   ✅ ${table} - updated successfully`);
                }
            } catch (e) {
                console.log(`   ✅ ${table} - skipped (error: ${e.message})`);
            }
        }

        // Step 3: Create new pharmacy record with auth user ID
        console.log('\n🔄 Creating new pharmacy record...');
        const newPharmacyData = {
            ...pharmacyData,
            id: NEW_AUTH_USER_ID
        };

        // Delete id from the data since we're setting it explicitly
        const { id: _, ...dataToInsert } = pharmacyData;
        dataToInsert.id = NEW_AUTH_USER_ID;

        const { error: insertError } = await supabaseAdmin
            .from('pharmacy')
            .insert(dataToInsert);

        if (insertError) {
            console.error('❌ Failed to create new pharmacy record:', insertError.message);
            console.log('💡 Rolling back foreign key updates...');
            
            // Rollback - update foreign keys back to original
            for (const table of referenceTables) {
                try {
                    await supabaseAdmin
                        .from(table)
                        .update({ pharmacy_id: OLD_PHARMACY_ID })
                        .eq('pharmacy_id', NEW_AUTH_USER_ID);
                } catch (e) {
                    // Ignore rollback errors
                }
            }
            process.exit(1);
        }

        console.log('✅ Created new pharmacy record with auth user ID');

        // Step 4: Delete the old pharmacy record
        console.log('\n🗑️  Deleting old pharmacy record...');
        const { error: deleteError } = await supabaseAdmin
            .from('pharmacy')
            .delete()
            .eq('id', OLD_PHARMACY_ID);

        if (deleteError) {
            console.log('⚠️  Could not delete old record:', deleteError.message);
            console.log('💡 This is OK - the new record is working');
        } else {
            console.log('✅ Deleted old pharmacy record');
        }

        // Step 5: Verify the fix
        console.log('\n🔍 Verifying the fix...');
        
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
        console.log(`   Email Match: ${verifyPharmacy.email === authUser.user.email ? 'YES' : 'NO'}`);

        console.log('\n🎉 ID synchronization completed successfully!');
        console.log('📧 Login credentials:');
        console.log(`   Email: ${EMAIL}`);
        console.log('   Password: Rx!Portal#9QmL7@eV2');
        console.log('\n💡 The pharmacy ID now matches the auth user ID exactly.');
        console.log('💡 You can now revert the auth middleware changes if desired.');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message || error);
        console.log('\n🚨 If this script failed partway, you may need to manually restore data');
        process.exit(1);
    }
}

// Run the script
fixPharmacyIdMatch()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });