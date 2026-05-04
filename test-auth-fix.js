#!/usr/bin/env node

/**
 * Test script to verify the authentication fix works
 * Usage: node test-auth-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const EMAIL = 'pharmacy@example.com';
const PASSWORD = 'Rx!Portal#9QmL7@eV2';

async function testAuthFix() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        console.log('🔐 Testing authentication fix...\n');

        console.log(`📧 Attempting login with: ${EMAIL}`);
        console.log(`🔑 Password: ${PASSWORD}\n`);

        // Test Supabase Auth login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: EMAIL,
            password: PASSWORD,
        });

        if (authError) {
            console.error('❌ Supabase Auth login failed:', authError.message);
            process.exit(1);
        }

        if (!authData.user) {
            console.error('❌ No user data returned from auth');
            process.exit(1);
        }

        console.log('✅ Supabase Auth login successful!');
        console.log(`   User ID: ${authData.user.id}`);
        console.log(`   Email: ${authData.user.email}`);
        console.log(`   Access Token: ${authData.session?.access_token?.substring(0, 20)}...`);

        // Now test the backend API call
        console.log('\n🔄 Testing API call with auth token...');
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${apiUrl}/pharmacy-reports/returns?limit=5`, {
            headers: {
                'Authorization': `Bearer ${authData.session?.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        const responseText = await response.text();
        
        console.log(`   Response Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
            console.log('✅ API call successful! Authentication middleware is working.');
            try {
                const jsonData = JSON.parse(responseText);
                console.log(`   Response: ${JSON.stringify(jsonData, null, 2)}`);
            } catch (e) {
                console.log(`   Response (text): ${responseText.substring(0, 200)}...`);
            }
        } else if (response.status === 403 && responseText.includes('Pharmacy profile not found')) {
            console.log('❌ Still getting "Pharmacy profile not found" error');
            console.log('💡 The authentication middleware may need a server restart');
            console.log(`   Response: ${responseText}`);
        } else {
            console.log('⚠️  Unexpected response:');
            console.log(`   ${responseText.substring(0, 200)}...`);
        }

        console.log('\n🎉 Authentication test completed!');
        
        // Clean up
        await supabase.auth.signOut();

    } catch (error) {
        console.error('❌ Test failed:', error.message || error);
        process.exit(1);
    }
}

// Run the test
testAuthFix()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test script failed:', error);
        process.exit(1);
    });