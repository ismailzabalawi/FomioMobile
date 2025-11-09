#!/usr/bin/env node

/**
 * Discourse Connection Test Script
 * 
 * This script tests the Discourse API connection.
 * Note: This app uses User API Keys for authentication.
 * Users authorize through the Discourse web interface.
 */

const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Then import the discourseApi module
const { discourseApi } = require('../shared/discourseApi.ts');

console.log('🔒 Discourse Connection Test');
console.log('This script will test your Discourse API connection.\n');
console.log('Note: This app uses User API Keys for authentication.');
console.log('Users authorize through the Discourse web interface.\n');

// Test basic connection
async function testConnection() {
  try {
    console.log('🔍 Testing Discourse connection...');
    
    const response = await discourseApi.checkConnectivity();
    
    if (response) {
      console.log('✅ Discourse connection successful!');
      console.log('✅ Your Discourse instance is accessible.');
      console.log('\nNext steps:');
      console.log('1. Start your Expo app: npm start');
      console.log('2. Test the User API Key authentication flow');
      console.log('3. Users will authorize through the Discourse web interface');
      return true;
    } else {
      console.log('❌ Discourse connection failed');
      console.log('Please check your .env file configuration:');
      console.log('1. Make sure EXPO_PUBLIC_DISCOURSE_URL is set correctly');
      console.log('2. Verify your Discourse instance is accessible');
      return false;
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
    return false;
  }
}

// Run the test
testConnection().then((success) => {
  if (success) {
    console.log('\n🎉 Connection Test Passed!');
  } else {
    console.log('\n❌ Connection Test Failed!');
  }
  process.exit(success ? 0 : 1);
}); 