// Test script to verify main admin login
const bcrypt = require('bcryptjs');

// Test credentials
const email = 'mainadmin@pharmadmin.com';
const password = 'MainAdmin123!';
const expectedHash = '$2a$10$nUp.QSi3vZNDWYPyTPxjz.1eywyR2DOKKi9P7IjFiyUiCowQ9321C';

console.log('=== Main Admin Login Test ===');
console.log('Email:', email);
console.log('Password:', password);
console.log('Expected Hash:', expectedHash);
console.log('Password matches hash:', bcrypt.compareSync(password, expectedHash));

// Test API endpoint
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/main-admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('\n=== API Test ===');
    console.log('Response Status:', response.status);
    
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.token) {
      console.log('✅ Login successful! Token received.');
    } else {
      console.log('❌ Login failed. No token received.');
    }
  } catch (error) {
    console.log('❌ API Error:', error.message);
    console.log('Make sure the backend server is running on port 3000');
  }
};

// Run the test if this script is executed directly
if (require.main === module) {
  testLogin();
}

module.exports = { testLogin };