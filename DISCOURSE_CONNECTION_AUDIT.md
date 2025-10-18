# 🔍 Discourse Integration Audit & Recommendations

## Executive Summary

Your FomioMobile app has a solid foundation for Discourse integration but requires critical authentication improvements to properly connect with https://meta.techrebels.info. This audit provides a comprehensive analysis and actionable recommendations.

---

## 📊 Current State Analysis

### ✅ What's Working Well

1. **Solid API Architecture**
   - Comprehensive `DiscourseApiService` class with 1500+ lines of well-structured code
   - Proper entity mapping: Categories → Hubs, Topics → Bytes, Posts → Comments
   - Singleton pattern implementation for API service
   - TypeScript type safety throughout

2. **Security Measures**
   - HTTPS enforcement
   - Rate limiting (60 requests/minute)
   - Input validation and sanitization
   - XSS protection
   - Secure token storage with AsyncStorage

3. **Advanced Features**
   - Request caching (5-minute duration)
   - Retry logic with exponential backoff
   - Timeout handling (10 seconds)
   - Error recovery mechanisms
   - Comprehensive logging

4. **API Coverage**
   - ✅ Topics (feed, categories, search)
   - ✅ Posts (create, reply, like)
   - ✅ Users (profiles, settings)
   - ✅ Notifications
   - ✅ Search functionality
   - ✅ Categories management

### ❌ Critical Issues

#### 1. **Authentication Architecture Mismatch** 🚨 CRITICAL

**Problem:** Your app tries to authenticate individual users with username/password, but Discourse REST API doesn't support this directly.

**Current Implementation:**
```typescript
// shared/useAuth.ts (Line 85-86)
const response = await discourseApiService.authenticateWithApiKey();
// This uses a SYSTEM API key, not user authentication
```

**What This Means:**
- The API key in `.env` is for server-to-server communication
- All API requests appear to come from the same admin user
- Cannot distinguish between different mobile app users
- Security vulnerability: All users would share the same session

#### 2. **Missing Environment Configuration**

**Problem:** No `.env` file exists in the project.

**Current Setup:**
```typescript
// shared/discourseApi.ts (Lines 1567-1570)
const defaultConfig: DiscourseConfig = {
  baseUrl: process.env.EXPO_PUBLIC_DISCOURSE_URL || 'https://meta.techrebels.info',
  apiKey: process.env.EXPO_PUBLIC_DISCOURSE_API_KEY,
  apiUsername: process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME,
};
```

**Result:** App runs with undefined credentials, all API calls fail.

#### 3. **Authentication Flow Confusion**

**Current Flow Issues:**
```typescript
// app/(auth)/signin.tsx
// User enters username/password
// App calls authenticateWithApiKey() (ignores user input!)
// Tries to authenticate with admin API key instead of user credentials
```

---

## 🎯 Recommended Solutions

### Solution 1: Discourse SSO (DiscourseConnect) - **RECOMMENDED** ⭐

**Best for:** Production apps with proper user authentication

**How It Works:**
1. User taps "Sign In" in your mobile app
2. App opens a web browser to Discourse SSO endpoint
3. User authenticates on Discourse website
4. Discourse redirects back to app with authentication payload
5. App validates payload and creates session

**Advantages:**
- ✅ Proper per-user authentication
- ✅ Secure - uses Discourse's native auth
- ✅ Supports all Discourse auth methods (2FA, OAuth, etc.)
- ✅ No password handling in mobile app
- ✅ Session management handled by Discourse

**Implementation Required:**
1. Enable SSO on your Discourse instance (admin panel)
2. Set up SSO secret
3. Implement expo-web-browser integration in app
4. Handle SSO callback in app
5. Store user-specific session tokens

**Discourse Documentation:**
- https://meta.discourse.org/t/discourseconnect-official-single-sign-on-for-discourse-sso/13045

### Solution 2: Discourse OAuth2 Provider

**Best for:** Apps requiring OAuth2 flow

**How It Works:**
1. Register your mobile app as OAuth2 client in Discourse
2. Implement OAuth2 PKCE flow in React Native
3. Get user-specific access tokens
4. Use tokens for API requests

**Advantages:**
- ✅ Industry-standard OAuth2
- ✅ Per-user authentication
- ✅ Token refresh support
- ✅ Fine-grained permissions

**Implementation Required:**
1. Enable OAuth2 provider in Discourse admin
2. Register app with redirect URI
3. Implement OAuth2 flow with `expo-auth-session`
4. Handle token storage and refresh

### Solution 3: API Key + User Impersonation (Limited Use)

**Best for:** Read-only apps or admin tools

**How It Works:**
1. Use admin API key for all requests
2. Optionally pass `Api-Username` header to act as specific user
3. Suitable for read-only scenarios

**Limitations:**
- ❌ Security concerns for multi-user apps
- ❌ Cannot distinguish between app users
- ❌ Requires admin-level API key
- ⚠️ Only suitable for trusted, internal apps

**Current Implementation:** This is what you have now, but it's not suitable for a production social media app.

---

## 📋 Implementation Roadmap

### Phase 1: Environment Setup (Immediate)

#### Step 1.1: Create `.env` file

```bash
# Create from template
cat > .env << 'EOF'
# Discourse Instance Configuration
EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info

# TEMPORARY: Admin API Key (for read-only testing)
# Create at: https://meta.techrebels.info/admin/api/keys
EXPO_PUBLIC_DISCOURSE_API_KEY=your_admin_api_key_here
EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_admin_username

# Security Settings
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true

# Development Settings
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_DATA=false

# SSO Configuration (add after Discourse SSO setup)
# EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_sso_secret_here
# EXPO_PUBLIC_APP_SCHEME=fomio
EOF
```

#### Step 1.2: Add `.env` to `.gitignore`

```bash
echo ".env" >> .gitignore
```

#### Step 1.3: Install dotenv support

```bash
npm install --save-dev @expo/env-loader
```

#### Step 1.4: Update `app.json`

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["@expo/env-loader", {
        "envFiles": [".env"]
      }]
    ]
  }
}
```

### Phase 2: Implement Discourse SSO (Recommended)

#### Step 2.1: Enable SSO on Discourse

1. Go to your Discourse admin panel: https://meta.techrebels.info/admin
2. Navigate to Settings → Login
3. Enable "enable discourse connect" (formerly "enable sso")
4. Set "discourse connect url" to your SSO endpoint (if using external provider)
5. Generate and save "discourse connect secret"
6. Configure "discourse connect provider secrets"

#### Step 2.2: Create SSO Service

Create `shared/discourseSsoService.ts`:

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Buffer } from 'buffer';
import crypto from 'crypto';

const SSO_SECRET = process.env.EXPO_PUBLIC_DISCOURSE_SSO_SECRET!;
const DISCOURSE_URL = process.env.EXPO_PUBLIC_DISCOURSE_URL!;
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || 'fomio';

export class DiscourseSsoService {
  /**
   * Initiates SSO login flow
   */
  static async login(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Generate nonce
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Create return URL (deep link back to app)
      const returnUrl = Linking.createURL('/auth/callback');
      
      // Build SSO payload
      const payload = `nonce=${nonce}&return_sso_url=${encodeURIComponent(returnUrl)}`;
      const base64Payload = Buffer.from(payload).toString('base64');
      const signature = crypto
        .createHmac('sha256', SSO_SECRET)
        .update(base64Payload)
        .digest('hex');
      
      // Build SSO URL
      const ssoUrl = `${DISCOURSE_URL}/session/sso_provider?sso=${encodeURIComponent(base64Payload)}&sig=${signature}`;
      
      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(ssoUrl, returnUrl);
      
      if (result.type === 'success' && result.url) {
        return this.handleCallback(result.url);
      }
      
      return { success: false, error: 'Authentication cancelled' };
    } catch (error) {
      console.error('SSO login error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }
  
  /**
   * Handles SSO callback from Discourse
   */
  static async handleCallback(callbackUrl: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const { queryParams } = Linking.parse(callbackUrl);
      const { sso, sig } = queryParams as { sso?: string; sig?: string };
      
      if (!sso || !sig) {
        return { success: false, error: 'Invalid SSO response' };
      }
      
      // Verify signature
      const expectedSig = crypto
        .createHmac('sha256', SSO_SECRET)
        .update(sso)
        .digest('hex');
      
      if (sig !== expectedSig) {
        return { success: false, error: 'Invalid SSO signature' };
      }
      
      // Decode payload
      const payload = Buffer.from(sso, 'base64').toString('utf8');
      const params = new URLSearchParams(payload);
      
      // Extract user data
      const user = {
        id: params.get('external_id'),
        username: params.get('username'),
        email: params.get('email'),
        name: params.get('name'),
        avatar: params.get('avatar_url'),
        admin: params.get('admin') === 'true',
        moderator: params.get('moderator') === 'true',
      };
      
      return { success: true, user };
    } catch (error) {
      console.error('SSO callback error:', error);
      return { success: false, error: 'Failed to process authentication' };
    }
  }
}
```

#### Step 2.3: Update Authentication Hook

Update `shared/useAuth.ts`:

```typescript
import { DiscourseSsoService } from './discourseSsoService';

export const useAuth = () => {
  // ... existing code ...
  
  const signIn = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Initiating SSO login...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Use SSO instead of API key authentication
      const response = await DiscourseSsoService.login();
      
      if (response.success && response.user) {
        // Store user data
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.user));
        
        console.log('✅ SSO login successful');
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        console.log('❌ SSO login failed:', response.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.error || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    }
  };
  
  // ... rest of code ...
};
```

#### Step 2.4: Configure Deep Linking

Update `app.json`:

```json
{
  "expo": {
    "scheme": "fomio",
    "ios": {
      "bundleIdentifier": "com.fomio.mobile"
    },
    "android": {
      "package": "com.fomio.mobile"
    }
  }
}
```

Create `app/auth/callback.tsx`:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { DiscourseSsoService } from '../../shared/discourseSsoService';

export default function AuthCallback() {
  const router = useRouter();
  
  useEffect(() => {
    // Handle SSO callback
    // This will be called when user is redirected back from Discourse
    router.replace('/(tabs)');
  }, []);
  
  return null;
}
```

### Phase 3: Testing & Validation

#### Step 3.1: Test Environment Setup

```bash
# Run environment setup script
node scripts/setup-env.js
```

#### Step 3.2: Test API Connection

```bash
# Test Discourse connectivity
node scripts/test-auth.js
```

#### Step 3.3: Test in App

1. Start the app: `npm start`
2. Test sign-in flow
3. Verify user data loads correctly
4. Test feed, posts, comments

### Phase 4: Production Readiness

#### Step 4.1: Security Checklist

- [ ] Disable debug mode in production
- [ ] Enable HTTPS enforcement
- [ ] Rotate API keys
- [ ] Set up proper error monitoring (Sentry)
- [ ] Configure rate limiting
- [ ] Enable CORS on Discourse for mobile app
- [ ] Set up SSL certificate pinning (optional)

#### Step 4.2: Performance Optimization

- [ ] Implement request batching
- [ ] Add offline support
- [ ] Optimize image loading
- [ ] Implement proper caching strategy
- [ ] Add pagination for all list endpoints

---

## 🔐 Security Best Practices

### For Discourse Instance (meta.techrebels.info)

1. **API Key Management**
   ```
   - Create separate API keys for development and production
   - Use user-level API keys, not admin keys
   - Rotate keys regularly
   - Monitor API usage in Discourse admin panel
   ```

2. **CORS Configuration**
   ```
   - Add your mobile app's domain to allowed CORS origins
   - In Discourse admin: Settings → CORS
   - Add: fomio://*, http://localhost:8081 (for dev)
   ```

3. **Rate Limiting**
   ```
   - Configure per-user rate limits in Discourse
   - Monitor abuse patterns
   - Implement client-side rate limiting (already done ✅)
   ```

### For Mobile App

1. **Secure Storage**
   ```typescript
   // Consider using expo-secure-store for sensitive data
   import * as SecureStore from 'expo-secure-store';
   
   // Instead of AsyncStorage for tokens
   await SecureStore.setItemAsync('auth_token', token);
   ```

2. **Certificate Pinning** (Advanced)
   ```typescript
   // Add to fetch requests for production
   // Ensures connection to genuine Discourse server
   ```

3. **Input Validation**
   ```
   ✅ Already implemented in discourseApi.ts
   - Username validation
   - Email validation
   - Content sanitization
   - XSS protection
   ```

---

## 📊 API Endpoint Reference

### Currently Implemented Endpoints

#### Authentication
- `GET /session/current.json` - Get current user
- `DELETE /session/current` - Logout
- ⚠️ Need to add: SSO endpoints

#### Topics (Bytes)
- `GET /latest.json` - Get latest topics
- `GET /c/:category.json` - Get category topics
- `GET /t/:id.json` - Get single topic
- `POST /posts.json` - Create topic/post
- `POST /post_actions.json` - Like/bookmark

#### Users
- `GET /users/:username.json` - Get user profile
- `PUT /users/:username` - Update profile
- `GET /users/:username/preferences.json` - Get settings

#### Search
- `GET /search.json` - Search topics, posts, users

#### Notifications
- `GET /notifications.json` - Get notifications
- `POST /notifications/:id/read.json` - Mark as read

### Missing but Recommended

- `GET /tags.json` - Get all tags
- `GET /badges.json` - Get badges
- `GET /categories.json` - Get all categories (implemented ✅)
- `PUT /posts/:id.json` - Edit post
- `DELETE /posts/:id.json` - Delete post

---

## 🚀 Quick Start Guide

### For Immediate Testing (Read-Only Mode)

1. **Create Admin API Key on Discourse**
   - Go to: https://meta.techrebels.info/admin/api/keys
   - Click "New API Key"
   - Select "All Users" scope
   - Description: "FomioMobile Development"
   - Copy the generated key

2. **Create `.env` file**
   ```bash
   cat > .env << 'EOF'
   EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info
   EXPO_PUBLIC_DISCOURSE_API_KEY=paste_your_api_key_here
   EXPO_PUBLIC_DISCOURSE_API_USERNAME=Soma
   EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
   EXPO_PUBLIC_ENABLE_RATE_LIMITING=true
   EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
   EOF
   ```

3. **Restart App**
   ```bash
   # Stop current server (Ctrl+C)
   npm start
   ```

4. **Test Connection**
   ```bash
   node scripts/test-auth.js
   ```

5. **Verify in App**
   - Open app
   - Navigate to Feed
   - You should see actual posts from meta.techrebels.info

### For Production (SSO Required)

Follow Phase 2 implementation above for proper user authentication.

---

## 📝 Environment Variables Reference

```bash
# Required
EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info
EXPO_PUBLIC_DISCOURSE_API_KEY=your_api_key
EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_username

# Optional - Security
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_CERT_PINNING=false
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true

# Optional - Development
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
EXPO_PUBLIC_ENABLE_MOCK_DATA=false

# Required for SSO (Phase 2)
EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_sso_secret
EXPO_PUBLIC_APP_SCHEME=fomio
```

---

## 🎯 Summary of Actions Required

### Immediate (Today)

1. ✅ Create `.env` file with your Discourse credentials
2. ✅ Create admin API key on meta.techrebels.info
3. ✅ Test connection with `node scripts/test-auth.js`
4. ✅ Verify feed loads real data from Discourse

### Short Term (This Week)

1. ⏳ Decide on authentication strategy (SSO recommended)
2. ⏳ Enable SSO on Discourse instance
3. ⏳ Implement SSO flow in mobile app
4. ⏳ Test end-to-end authentication
5. ⏳ Add error monitoring (Sentry)

### Long Term (Next Sprint)

1. 📋 Implement offline support
2. 📋 Add push notifications
3. 📋 Optimize performance
4. 📋 Add analytics
5. 📋 Prepare for app store submission

---

## 🆘 Troubleshooting

### Issue: "Network error" or "Failed to fetch"

**Causes:**
- Discourse instance not accessible
- CORS not configured
- Wrong URL in .env

**Solutions:**
1. Test Discourse URL in browser: https://meta.techrebels.info
2. Check CORS settings in Discourse admin
3. Verify `.env` file is loaded correctly

### Issue: "Invalid API key"

**Causes:**
- Wrong API key format
- Key revoked or expired
- Key doesn't have required permissions

**Solutions:**
1. Regenerate API key in Discourse admin
2. Ensure key has "All Users" scope
3. Check key is correctly copied to `.env`

### Issue: "Rate limited"

**Causes:**
- Too many requests in short time
- Rate limit too strict

**Solutions:**
1. Implement request debouncing
2. Increase rate limit in app config
3. Adjust Discourse rate limits

---

## 📚 Additional Resources

### Discourse API Documentation
- Official API Docs: https://docs.discourse.org/
- API Reference: https://meta.discourse.org/t/discourse-api-documentation/22706
- SSO Guide: https://meta.discourse.org/t/discourseconnect-official-single-sign-on-for-discourse-sso/13045

### React Native Resources
- Expo Web Browser: https://docs.expo.dev/versions/latest/sdk/webbrowser/
- Expo Auth Session: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Expo Linking: https://docs.expo.dev/versions/latest/sdk/linking/

### Security Resources
- OWASP Mobile Top 10: https://owasp.org/www-project-mobile-top-10/
- Expo Security Guidelines: https://docs.expo.dev/guides/security/

---

## ✅ Next Steps

**Based on this audit, your immediate next steps are:**

1. **Create `.env` file** (5 minutes)
2. **Generate Discourse API key** (5 minutes)
3. **Test connection** (5 minutes)
4. **Review SSO implementation plan** (30 minutes)
5. **Schedule SSO development** (2-4 hours implementation)

**Priority: HIGH** - Without proper environment setup, the app cannot connect to Discourse.

Would you like me to help you with any of these steps?

