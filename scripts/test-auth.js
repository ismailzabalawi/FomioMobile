#!/usr/bin/env node

/**
 * Discourse Authentication Test Script
 * 
 * This script helps you test the Discourse API connection and authentication flow.
 * Run this before implementing the full integration.
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bold}${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test configuration
const testConfig = {
  discourseUrl: process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://your-discourse-instance.com',
  apiKey: process.env.EXPO_PUBLIC_DISCOURSE_API_KEY || 'your_api_key_here',
  apiUsername: process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME || 'your_api_username_here',
};

function validateUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
  } catch {
    return false;
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'FomioMobile/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testDiscourseConnection() {
  logStep('🔍 Testing Discourse Connection');
  
  // Check if URL is configured
  if (!testConfig.discourseUrl || testConfig.discourseUrl === 'https://your-discourse-instance.com') {
    logError('Discourse URL not configured. Please set EXPO_PUBLIC_DISCOURSE_URL in your .env file.');
    return false;
  }

  // Validate URL format
  if (!validateUrl(testConfig.discourseUrl)) {
    logError('Invalid Discourse URL format. Please use a valid HTTP/HTTPS URL.');
    return false;
  }

  logInfo(`Testing connection to: ${testConfig.discourseUrl}`);

  try {
    // Test basic connection
    const response = await makeRequest(`${testConfig.discourseUrl}/about.json`);
    
    if (response.status === 200) {
      logSuccess('Discourse instance is accessible');
      
      if (response.data.about) {
        logInfo(`Site title: ${response.data.about.title}`);
        logInfo(`Version: ${response.data.about.version}`);
      }
      
      return true;
    } else {
      logError(`Failed to connect. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    return false;
  }
}

async function testApiAuthentication() {
  logStep('🔐 Testing API Authentication');
  
  // Check if API credentials are configured
  if (!testConfig.apiKey || testConfig.apiKey === 'your_api_key_here') {
    logError('API Key not configured. Please set EXPO_PUBLIC_DISCOURSE_API_KEY in your .env file.');
    return false;
  }

  if (!testConfig.apiUsername || testConfig.apiUsername === 'your_api_username_here') {
    logError('API Username not configured. Please set EXPO_PUBLIC_DISCOURSE_API_USERNAME in your .env file.');
    return false;
  }

  logInfo('Testing API authentication...');

  try {
    // Test user authentication
    const response = await makeRequest(
      `${testConfig.discourseUrl}/admin/users/list/active.json`,
      {
        headers: {
          'Api-Key': testConfig.apiKey,
          'Api-Username': testConfig.apiUsername
        }
      }
    );

    if (response.status === 200) {
      logSuccess('API authentication successful');
      logInfo(`Found ${response.data.directory_items?.length || 0} active users`);
      return true;
    } else if (response.status === 403) {
      logError('API authentication failed. Check your API key and username.');
      return false;
    } else {
      logError(`API request failed. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`API authentication failed: ${error.message}`);
    return false;
  }
}

async function testUserEndpoints() {
  logStep('👤 Testing User Endpoints');
  
  try {
    // Test current user endpoint
    const response = await makeRequest(
      `${testConfig.discourseUrl}/session/current.json`,
      {
        headers: {
          'Api-Key': testConfig.apiKey,
          'Api-Username': testConfig.apiUsername
        }
      }
    );

    if (response.status === 200) {
      logSuccess('User session endpoint working');
      if (response.data.current_user) {
        logInfo(`Current user: ${response.data.current_user.username}`);
      }
      return true;
    } else {
      logError(`User session failed. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`User endpoint test failed: ${error.message}`);
    return false;
  }
}

async function generateEnvTemplate() {
  logStep('📝 Environment Configuration');
  
  logInfo('Create a .env file in your project root with the following content:');
  log('');
  log('```', 'blue');
  log('# Discourse API Configuration', 'blue');
  log('# Replace these values with your actual Discourse instance details', 'blue');
  log('', 'blue');
  log('# Your Discourse instance URL (must be HTTPS in production)', 'blue');
  log('EXPO_PUBLIC_DISCOURSE_URL=https://your-discourse-instance.com', 'blue');
  log('', 'blue');
  log('# Discourse API credentials (create these in your Discourse admin panel)', 'blue');
  log('EXPO_PUBLIC_DISCOURSE_API_KEY=your_api_key_here', 'blue');
  log('EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_api_username_here', 'blue');
  log('', 'blue');
  log('# Security Settings', 'blue');
  log('EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true', 'blue');
  log('EXPO_PUBLIC_ENABLE_CERT_PINNING=false', 'blue');
  log('EXPO_PUBLIC_ENABLE_RATE_LIMITING=true', 'blue');
  log('', 'blue');
  log('# Development Settings (disable in production)', 'blue');
  log('EXPO_PUBLIC_ENABLE_DEBUG_MODE=true', 'blue');
  log('EXPO_PUBLIC_ENABLE_MOCK_DATA=false', 'blue');
  log('```', 'blue');
  log('');
  
  logWarning('Important: Never commit your .env file to version control!');
  logInfo('Add .env to your .gitignore file if it\'s not already there.');
}

async function main() {
  log(`${colors.bold}🔒 Discourse Authentication Test${colors.reset}`);
  log('This script will test your Discourse API configuration and authentication.');
  log('');

  // Generate environment template
  await generateEnvTemplate();

  // Test connection
  const connectionOk = await testDiscourseConnection();
  if (!connectionOk) {
    logError('Cannot proceed without a valid Discourse connection.');
    process.exit(1);
  }

  // Test API authentication
  const authOk = await testApiAuthentication();
  if (!authOk) {
    logError('Cannot proceed without valid API credentials.');
    process.exit(1);
  }

  // Test user endpoints
  const userOk = await testUserEndpoints();
  if (!userOk) {
    logError('User endpoints are not working properly.');
    process.exit(1);
  }

  logStep('🎉 All Tests Passed!');
  logSuccess('Your Discourse configuration is working correctly.');
  logInfo('You can now proceed with implementing the full authentication flow in your app.');
  log('');
  logInfo('Next steps:');
  logInfo('1. Update your .env file with the correct values');
  logInfo('2. Test the authentication flow in your React Native app');
  logInfo('3. Implement the remaining hooks (useFeed, useCreateByte, etc.)');
}

// Run the test
if (require.main === module) {
  main().catch((error) => {
    logError(`Test failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testDiscourseConnection,
  testApiAuthentication,
  testUserEndpoints
}; 