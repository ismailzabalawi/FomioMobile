#!/usr/bin/env node

/**
 * Discourse Authentication Test Script
 * 
 * This script helps you test the Discourse API connection and authentication flow.
 * Run this before implementing the full integration.
 */

const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Then import the discourseApi module
const { discourseApi } = require('../shared/discourseApi.ts');

console.log('🔒 Discourse Authentication Test');
console.log('This script will test your Discourse API configuration and authentication.\n');

// Test the new authenticateWithApiKey method
async function testApiKeyAuthentication() {
  try {
    console.log('🔐 Testing API Key Authentication...');
    
    const response = await discourseApi.authenticateWithApiKey();
    
    if (response.success && response.data) {
      console.log('✅ API Key authentication successful!');
      console.log(`👤 Authenticated as: ${response.data.user.username}`);
      console.log(`📧 Email: ${response.data.user.email || 'Not provided'}`);
      console.log(`🆔 User ID: ${response.data.user.id}`);
      return true;
    } else {
      console.log('❌ API Key authentication failed:');
      console.log(`   Error: ${response.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ API Key authentication error:', error.message);
    return false;
  }
}

// Run the test
testApiKeyAuthentication().then((success) => {
  if (success) {
    console.log('\n🎉 API Key Authentication Test Passed!');
    console.log('✅ Your Discourse configuration is working correctly.');
    console.log('✅ You can now sign in to the FomioMobile app.');
  } else {
    console.log('\n❌ API Key Authentication Test Failed!');
    console.log('Please check your .env file configuration:');
    console.log('1. Make sure EXPO_PUBLIC_DISCOURSE_API_KEY is set');
    console.log('2. Make sure EXPO_PUBLIC_DISCOURSE_API_USERNAME is set');
    console.log('3. Verify your Discourse instance is accessible');
  }
}); 