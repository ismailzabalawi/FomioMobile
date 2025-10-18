#!/usr/bin/env node

/**
 * Discourse Connection Test Script
 * Tests your FomioMobile app's connection to Discourse backend
 * 
 * Usage: node scripts/discourse-connection-test.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function section(message) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(message, colors.bright);
  log('='.repeat(60), colors.bright);
}

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    error('No .env file found!');
    info('Create one by running: cp env.example .env');
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  
  return env;
}

// Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test Discourse connection
async function testConnection(baseUrl, apiKey, apiUsername) {
  section('🔍 Testing Discourse Connection');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Site accessibility
  totalTests++;
  info('Test 1: Checking if Discourse site is accessible...');
  try {
    const response = await makeRequest(`${baseUrl}/site.json`);
    if (response.status === 200 && response.data) {
      success('Site is accessible');
      info(`  Site title: ${response.data.title || 'Unknown'}`);
      passedTests++;
    } else {
      error(`Site returned status ${response.status}`);
    }
  } catch (e) {
    error(`Cannot reach Discourse site: ${e.message}`);
    warning('Check that the URL is correct and the site is online');
  }
  
  // Test 2: API authentication
  totalTests++;
  info('\nTest 2: Testing API authentication...');
  try {
    const headers = {
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
      'Content-Type': 'application/json',
    };
    
    const response = await makeRequest(`${baseUrl}/session/current.json`, { headers });
    
    if (response.status === 200 && response.data) {
      if (response.data.current_user) {
        success('API authentication successful');
        info(`  Authenticated as: ${response.data.current_user.username}`);
        info(`  User ID: ${response.data.current_user.id}`);
        info(`  Trust Level: ${response.data.current_user.trust_level}`);
        passedTests++;
      } else {
        warning('API key works but no user authenticated');
        info('  This is normal for some API key configurations');
        passedTests++;
      }
    } else if (response.status === 403) {
      error('API key authentication failed (403 Forbidden)');
      warning('Check that your API key has the correct permissions');
    } else if (response.status === 401) {
      error('API key is invalid (401 Unauthorized)');
      warning('Regenerate your API key in Discourse admin panel');
    } else {
      error(`API authentication failed with status ${response.status}`);
    }
  } catch (e) {
    error(`API authentication error: ${e.message}`);
  }
  
  // Test 3: Categories endpoint
  totalTests++;
  info('\nTest 3: Testing categories endpoint...');
  try {
    const headers = {
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
    };
    
    const response = await makeRequest(`${baseUrl}/categories.json`, { headers });
    
    if (response.status === 200 && response.data) {
      success('Categories endpoint working');
      const categories = response.data.category_list?.categories || [];
      info(`  Found ${categories.length} categories`);
      if (categories.length > 0) {
        info(`  Example: "${categories[0].name}"`);
      }
      passedTests++;
    } else {
      error(`Categories endpoint failed with status ${response.status}`);
    }
  } catch (e) {
    error(`Categories endpoint error: ${e.message}`);
  }
  
  // Test 4: Latest topics endpoint
  totalTests++;
  info('\nTest 4: Testing latest topics endpoint...');
  try {
    const headers = {
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
    };
    
    const response = await makeRequest(`${baseUrl}/latest.json`, { headers });
    
    if (response.status === 200 && response.data) {
      success('Latest topics endpoint working');
      const topics = response.data.topic_list?.topics || [];
      info(`  Found ${topics.length} topics`);
      if (topics.length > 0) {
        info(`  Latest: "${topics[0].title}"`);
      }
      passedTests++;
    } else {
      error(`Latest topics endpoint failed with status ${response.status}`);
    }
  } catch (e) {
    error(`Latest topics endpoint error: ${e.message}`);
  }
  
  // Test 5: Search endpoint
  totalTests++;
  info('\nTest 5: Testing search endpoint...');
  try {
    const headers = {
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
    };
    
    const response = await makeRequest(`${baseUrl}/search.json?q=test`, { headers });
    
    if (response.status === 200) {
      success('Search endpoint working');
      passedTests++;
    } else {
      error(`Search endpoint failed with status ${response.status}`);
    }
  } catch (e) {
    error(`Search endpoint error: ${e.message}`);
  }
  
  // Summary
  section('📊 Test Summary');
  log(`\nPassed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? colors.green : colors.yellow);
  
  if (passedTests === totalTests) {
    success('\n🎉 All tests passed! Your Discourse connection is working perfectly!');
    info('\nNext steps:');
    info('1. Start your app: npm start');
    info('2. Navigate to the Feed to see real Discourse posts');
    info('3. Review DISCOURSE_CONNECTION_AUDIT.md for SSO setup');
  } else {
    warning('\n⚠️  Some tests failed. Please review the errors above.');
    info('\nTroubleshooting:');
    info('1. Verify your API key is correct and has proper permissions');
    info('2. Check that your Discourse instance is accessible');
    info('3. Ensure CORS is configured if testing from web');
    info('4. See QUICK_START.md for detailed setup instructions');
  }
  
  return passedTests === totalTests;
}

// Validate environment configuration
function validateEnv(env) {
  section('🔧 Validating Configuration');
  
  const required = [
    'EXPO_PUBLIC_DISCOURSE_URL',
    'EXPO_PUBLIC_DISCOURSE_API_KEY',
    'EXPO_PUBLIC_DISCOURSE_API_USERNAME',
  ];
  
  let valid = true;
  
  for (const key of required) {
    if (!env[key] || env[key].includes('your_') || env[key].includes('_here')) {
      error(`${key} is not configured`);
      valid = false;
    } else {
      success(`${key} is set`);
    }
  }
  
  // Check URL format
  if (env.EXPO_PUBLIC_DISCOURSE_URL) {
    const url = env.EXPO_PUBLIC_DISCOURSE_URL;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      error('EXPO_PUBLIC_DISCOURSE_URL must start with http:// or https://');
      valid = false;
    } else if (url.endsWith('/')) {
      warning('EXPO_PUBLIC_DISCOURSE_URL should not end with a slash');
      info(`  Should be: ${url.slice(0, -1)}`);
    }
  }
  
  // Check security settings
  info('\nSecurity Settings:');
  info(`  HTTPS Only: ${env.EXPO_PUBLIC_ENABLE_HTTPS_ONLY || 'not set'}`);
  info(`  Rate Limiting: ${env.EXPO_PUBLIC_ENABLE_RATE_LIMITING || 'not set'}`);
  info(`  Debug Mode: ${env.EXPO_PUBLIC_ENABLE_DEBUG_MODE || 'not set'}`);
  
  return valid;
}

// Main execution
async function main() {
  log('\n' + '🚀 Fomio Mobile - Discourse Connection Test'.padEnd(60), colors.bright);
  log('Testing connection to your Discourse backend\n', colors.gray);
  
  // Load environment
  const env = loadEnv();
  if (!env) {
    error('\n❌ Cannot proceed without .env file');
    info('\nQuick setup:');
    info('1. Copy the template: cp env.example .env');
    info('2. Edit .env with your Discourse credentials');
    info('3. Run this script again');
    process.exit(1);
  }
  
  success('.env file loaded');
  
  // Validate configuration
  const validConfig = validateEnv(env);
  if (!validConfig) {
    error('\n❌ Configuration is incomplete');
    info('\nPlease update your .env file with valid credentials');
    info('See QUICK_START.md for detailed instructions');
    process.exit(1);
  }
  
  // Test connection
  const baseUrl = env.EXPO_PUBLIC_DISCOURSE_URL.replace(/\/$/, '');
  const apiKey = env.EXPO_PUBLIC_DISCOURSE_API_KEY;
  const apiUsername = env.EXPO_PUBLIC_DISCOURSE_API_USERNAME;
  
  const success = await testConnection(baseUrl, apiKey, apiUsername);
  
  process.exit(success ? 0 : 1);
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

