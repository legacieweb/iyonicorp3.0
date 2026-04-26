// Test script to verify Coolify API connection
// Run with: node test-coolify.js

const axios = require('axios');

const COOLIFY_API_URL = process.env.VITE_COOLIFY_API_URL || 'http://localhost:8000/api/v1';
const API_TOKEN = process.env.VITE_COOLIFY_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ VITE_COOLIFY_API_TOKEN is not set');
  console.log('\nTo fix this:');
  console.log('1. Create a .env file in the project root');
  console.log('2. Add: VITE_COOLIFY_API_TOKEN=your_token_here');
  console.log('3. Get your token from http://localhost:8000/settings');
  process.exit(1);
}

const coolify = axios.create({
  baseURL: COOLIFY_API_URL,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function testConnection() {
  console.log('🔍 Testing Coolify API connection...');
  console.log(`   API URL: ${COOLIFY_API_URL}`);
  console.log(`   Token: ${API_TOKEN.substring(0, 10)}...`);
  
  try {
    const response = await coolify.get('/projects');
    console.log('\n✅ Connection successful!');
    console.log(`   Found ${response.data.length} project(s)`);
    
    if (response.data.length > 0) {
      console.log('\nProjects:');
      response.data.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name} (${project.status || 'Active'})`);
      });
    }
  } catch (error) {
    console.error('\n❌ Connection failed!');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 This usually means:');
        console.log('   - Your API token is invalid or expired');
        console.log('   - Generate a new token at http://localhost:8000/settings');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

testConnection();
