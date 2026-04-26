import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testRegistrationFailure() {
  const testUser = {
    name: 'Test Failure User',
    email: 'test_fail_' + Date.now() + '@example.com',
    password: 'password123',
    role: 'seller',
    // storeName is missing!
  };

  console.log('Testing registration with missing storeName:', testUser);

  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('✅ Registration successful (unexpectedly)!');
  } catch (error) {
    console.log('❌ Registration failed as expected!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testRegistrationFailure();
