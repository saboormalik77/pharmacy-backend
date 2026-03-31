#!/usr/bin/env npx ts-node

/**
 * Script to test destruction data for pharmacy
 */

import { supabaseAdmin } from '../config/supabase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testDestructionData() {
    if (!supabaseAdmin) {
        console.error('❌ Supabase admin client not configured');
        process.exit(1);
    }

    try {
        console.log('🔍 Checking destruction records...');
        
        // Get all destruction records
        const { data: allRecords, error: allError } = await supabaseAdmin
            .from('destruction_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (allError) {
            console.error('❌ Error fetching all destruction records:', allError);
        } else {
            console.log(`📋 Total destruction records in database: ${allRecords?.length || 0}`);
            if (allRecords && allRecords.length > 0) {
                console.log('📋 Sample records:');
                allRecords.slice(0, 3).forEach((record, i) => {
                    console.log(`  ${i + 1}. ID: ${record.id}, Pharmacy: ${record.pharmacy_id}, Status: ${record.status}, Product: ${record.product_name || 'N/A'}`);
                });
            }
        }

        // Check return transaction items with destination 'destruction'
        console.log('\n🔍 Checking return transaction items with destination "destruction"...');
        const { data: destructionItems, error: itemsError } = await supabaseAdmin
            .from('return_transaction_items')
            .select('*')
            .eq('destination', 'destruction')
            .order('created_at', { ascending: false });

        if (itemsError) {
            console.error('❌ Error fetching destruction items:', itemsError);
        } else {
            console.log(`📦 Return items marked for destruction: ${destructionItems?.length || 0}`);
            if (destructionItems && destructionItems.length > 0) {
                console.log('📦 Sample items:');
                destructionItems.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i + 1}. ID: ${item.id}, Return Status: ${item.return_status}, Destination: ${item.destination}, Product: ${item.proprietary_name || item.generic_name || 'N/A'}`);
                });
            }
        }

        // Check pharmacies
        console.log('\n🏥 Checking pharmacies...');
        const { data: pharmacies, error: pharmError } = await supabaseAdmin
            .from('pharmacy')
            .select('id, email, name, pharmacy_name')
            .limit(5);

        if (pharmError) {
            console.error('❌ Error fetching pharmacies:', pharmError);
        } else {
            console.log(`🏥 Pharmacies in database: ${pharmacies?.length || 0}`);
            if (pharmacies && pharmacies.length > 0) {
                console.log('🏥 Sample pharmacies:');
                pharmacies.forEach((pharmacy, i) => {
                    console.log(`  ${i + 1}. ID: ${pharmacy.id}, Email: ${pharmacy.email}, Name: ${pharmacy.pharmacy_name || pharmacy.name}`);
                });
            }
        }

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message || error);
    }
}

// Run the script
testDestructionData()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });