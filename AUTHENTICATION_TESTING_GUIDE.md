# 🔒 Discourse Authentication Testing Guide

## Overview

This guide will help you test the Discourse authentication flow in your FomioMobile app. We've implemented secure authentication with proper error handling and validation.

## 🚀 Quick Start

### 1. **Set Up Environment Variables**

Create a `.env` file in your project root with your Discourse instance details:

```bash
# Discourse API Configuration
EXPO_PUBLIC_DISCOURSE_URL=https://your-discourse-instance.com
EXPO_PUBLIC_DISCOURSE_API_KEY=your_api_key_here
EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_api_username_here

# Security Settings
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_CERT_PINNING=false
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true

# Development Settings
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_DATA=false
```

### 2. **Get Discourse API Credentials**

1. **Log into your Discourse admin panel**
2. **Go to Admin → API → API Keys**
3. **Create a new API key** with appropriate permissions:
   - `read` - for basic user data
   - `write` - for creating posts and updating profiles
   - `admin` - for administrative functions (if needed)

### 3. **Test the Connection**

#### **Option A: Use the Test Script**
```bash
# Run the Node.js test script
node scripts/test-auth.js
```

#### **Option B: Use the React Native Test Screen**
1. **Start your Expo app**
2. **Navigate to the auth test screen** (you can add it to your tab navigation temporarily)
3. **Run the tests** using the UI

## 🧪 Testing Steps

### **Step 1: Basic Connection Test**
- ✅ **Discourse URL is accessible**
- ✅ **HTTPS is enforced** (in production)
- ✅ **API credentials are valid**

### **Step 2: Authentication Test**
- ✅ **API key authentication works**
- ✅ **User session can be established**
- ✅ **Token storage is secure**

### **Step 3: User Data Test**
- ✅ **User profile can be retrieved**
- ✅ **User settings can be accessed**
- ✅ **Avatar URLs are working**

### **Step 4: Security Validation**
- ✅ **Input validation is working**
- ✅ **Rate limiting is active**
- ✅ **Error handling is secure**

## 🔧 Troubleshooting

### **Common Issues**

#### **1. "Discourse URL not configured"**
```bash
# Solution: Set the environment variable
EXPO_PUBLIC_DISCOURSE_URL=https://your-discourse-instance.com
```

#### **2. "API authentication failed"**
```bash
# Check your API credentials
EXPO_PUBLIC_DISCOURSE_API_KEY=your_actual_api_key
EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_actual_username
```

#### **3. "Connection failed"**
- Verify your Discourse instance is running
- Check if the URL is correct
- Ensure HTTPS is enabled (for production)

#### **4. "Rate limiting error"**
- The app enforces rate limiting (60 requests/minute)
- Wait a moment and try again
- Check if your Discourse instance has its own rate limits

### **Debug Mode**

Enable debug mode to see detailed logs:

```bash
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
```

## 📱 Testing in the App

### **1. Profile Page Test**
Navigate to the profile page (`app/(profile)/index.tsx`) to test:
- ✅ User data loading
- ✅ Avatar display
- ✅ Trust level display
- ✅ Activity stats

### **2. Authentication Flow Test**
Test the complete authentication flow:
- ✅ Sign in with valid credentials
- ✅ Sign out functionality
- ✅ Token persistence
- ✅ Session management

### **3. Security Features Test**
Verify security features are working:
- ✅ Input validation
- ✅ HTTPS enforcement
- ✅ Rate limiting
- ✅ Error handling

## 🔐 Security Checklist

### **Before Production**

- [ ] **HTTPS is enforced** (`EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true`)
- [ ] **Debug mode is disabled** (`EXPO_PUBLIC_ENABLE_DEBUG_MODE=false`)
- [ ] **Mock data is disabled** (`EXPO_PUBLIC_ENABLE_MOCK_DATA=false`)
- [ ] **Rate limiting is enabled** (`EXPO_PUBLIC_ENABLE_RATE_LIMITING=true`)
- [ ] **API credentials are secure** (not in version control)
- [ ] **Error messages don't leak sensitive information**

### **API Key Permissions**

Ensure your API key has the minimum required permissions:

```json
{
  "read": true,
  "write": true,
  "admin": false
}
```

## 📊 Expected Test Results

### **Successful Test Run**
```
✅ Discourse Connection
✅ API Authentication  
✅ User Data
✅ Auth Hook
```

### **Partial Success (Common)**
```
✅ Discourse Connection
❌ API Authentication (check credentials)
⚠️ User Data (no user logged in)
✅ Auth Hook
```

### **Failed Test Run**
```
❌ Discourse Connection (check URL)
❌ API Authentication
❌ User Data
❌ Auth Hook
```

## 🚀 Next Steps

After successful authentication testing:

1. **Implement the remaining hooks**:
   - `useFeed` - for loading posts/topics
   - `useCreateByte` - for creating new posts
   - `useNotifications` - for notification handling
   - `useSearch` - for search functionality

2. **Test the complete user flow**:
   - User registration
   - User login
   - Profile editing
   - Post creation
   - Comment interaction

3. **Deploy to production**:
   - Update environment variables
   - Disable debug mode
   - Enable HTTPS enforcement
   - Test on real devices

## 📞 Support

If you encounter issues:

1. **Check the console logs** for detailed error messages
2. **Verify your Discourse instance** is accessible
3. **Test API credentials** using the Discourse admin panel
4. **Review the security implementation** in `SECURITY_IMPLEMENTATION.md`

## 🔄 Continuous Testing

Set up automated testing for:
- ✅ API connectivity
- ✅ Authentication flow
- ✅ User data retrieval
- ✅ Security features
- ✅ Rate limiting behavior

---

**Remember**: Security is the top priority. Always test in a safe environment before deploying to production. 