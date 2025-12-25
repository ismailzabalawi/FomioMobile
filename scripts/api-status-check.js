#!/usr/bin/env node

/**
 * Discourse API Status Check Script
 * Verifies the current status of the API integration
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const API_CONFIG = {
  baseUrl: 'https://meta.fomio.app',
  endpoints: [
    '/site.json',
    '/categories.json',
    '/session/current.json',
  ],
  timeout: 10000,
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Helper function to make HTTPS requests
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'Fomio-StatusCheck/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: Date.now(),
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test individual endpoint
async function testEndpoint(endpoint) {
  const startTime = Date.now();
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  
  try {
    console.log(`${colors.blue}🔍 Testing: ${endpoint}${colors.reset}`);
    
    const response = await makeRequest(url, API_CONFIG.timeout);
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200) {
      console.log(`${colors.green}✅ ${endpoint} - ${response.status} (${responseTime}ms)${colors.reset}`);
      return {
        endpoint,
        status: 'success',
        statusCode: response.status,
        responseTime,
        dataSize: response.data.length,
      };
    } else {
      console.log(`${colors.yellow}⚠️  ${endpoint} - ${response.status} (${responseTime}ms)${colors.reset}`);
      return {
        endpoint,
        status: 'warning',
        statusCode: response.status,
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`${colors.red}❌ ${endpoint} - Error: ${error.message} (${responseTime}ms)${colors.reset}`);
    return {
      endpoint,
      status: 'error',
      error: error.message,
      responseTime,
    };
  }
}

// Test API connectivity
async function testConnectivity() {
  console.log(`${colors.bold}🌐 Testing Discourse API Connectivity${colors.reset}`);
  console.log(`Base URL: ${API_CONFIG.baseUrl}`);
  console.log(`Timeout: ${API_CONFIG.timeout}ms`);
  console.log('─'.repeat(50));

  const results = [];
  
  for (const endpoint of API_CONFIG.endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Generate summary report
function generateReport(results) {
  console.log('\n' + '─'.repeat(50));
  console.log(`${colors.bold}📊 API Status Report${colors.reset}`);
  console.log('─'.repeat(50));

  const successful = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;

  console.log(`Total Endpoints Tested: ${total}`);
  console.log(`${colors.green}✅ Successful: ${successful}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`);
  console.log(`${colors.red}❌ Errors: ${errors}${colors.reset}`);

  // Calculate average response time
  const successfulResults = results.filter(r => r.status === 'success');
  if (successfulResults.length > 0) {
    const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  }

  // Overall status
  if (errors === 0 && warnings === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 API Status: EXCELLENT${colors.reset}`);
  } else if (errors === 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  API Status: GOOD${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}🚨 API Status: NEEDS ATTENTION${colors.reset}`);
  }

  // Detailed results
  console.log('\n' + '─'.repeat(50));
  console.log(`${colors.bold}📋 Detailed Results${colors.reset}`);
  console.log('─'.repeat(50));

  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
    const statusColor = result.status === 'success' ? colors.green : 
                       result.status === 'warning' ? colors.yellow : colors.red;
    
    console.log(`${statusColor}${statusIcon} ${result.endpoint}${colors.reset}`);
    console.log(`   Status: ${result.statusCode || 'N/A'}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    if (result.dataSize) {
      console.log(`   Data Size: ${result.dataSize} bytes`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
}

// Security check
function securityCheck() {
  console.log(`${colors.bold}🔒 Security Configuration Check${colors.reset}`);
  console.log('─'.repeat(50));

  const checks = [
    {
      name: 'HTTPS Protocol',
      status: API_CONFIG.baseUrl.startsWith('https://'),
      description: 'Using secure HTTPS connection',
    },
    {
      name: 'Valid Domain',
      status: API_CONFIG.baseUrl.includes('meta.fomio.app'),
      description: 'Using configured Discourse instance',
    },
    {
      name: 'Timeout Configuration',
      status: API_CONFIG.timeout >= 5000 && API_CONFIG.timeout <= 30000,
      description: 'Reasonable timeout setting',
    },
  ];

  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    const color = check.status ? colors.green : colors.red;
    console.log(`${color}${icon} ${check.name}${colors.reset}`);
    console.log(`   ${check.description}`);
  });

  const allPassed = checks.every(check => check.status);
  console.log(`\n${allPassed ? colors.green : colors.red}${allPassed ? '🔒 All security checks passed' : '🚨 Security issues detected'}${colors.reset}`);
}

// Main execution
async function main() {
  try {
    console.log(`${colors.bold}🚀 Fomio Discourse API Status Check${colors.reset}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    // Run connectivity tests
    const results = await testConnectivity();
    
    // Generate report
    generateReport(results);
    
    // Security check
    console.log('');
    securityCheck();
    
    console.log(`\n${colors.bold}✨ Status check completed at: ${new Date().toISOString()}${colors.reset}`);
    
    // Exit with appropriate code
    const hasErrors = results.some(r => r.status === 'error');
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}💥 Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testEndpoint,
  testConnectivity,
  generateReport,
  securityCheck,
}; 