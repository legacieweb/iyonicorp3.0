import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testRegistration() {
  const testUser = {
    name: 'Test User ' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    role: 'seller',
    storeName: 'Test Store',
    subdomain: 'test-store-' + Date.now()
  };

  console.log('Testing registration with:', testUser);

  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('✅ Registration successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('❌ Registration failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRegistration();
