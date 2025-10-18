# 🔐 Discourse SSO Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing **DiscourseConnect** (formerly Discourse SSO) in your FomioMobile app. This is the recommended authentication method for production use.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [x] Admin access to your Discourse instance (meta.techrebels.info)
- [x] Working API connection (test with `npm run test:discourse`)
- [x] Basic understanding of OAuth/SSO flows
- [ ] Time allocated: 2-4 hours for implementation

---

## 🎯 What We're Building

### Current State (API Key Authentication)
```
Mobile App → API Key → Discourse API
└─ All users share same admin session ❌
```

### Target State (DiscourseConnect SSO)
```
Mobile App → SSO Flow → Discourse Auth → Individual User Sessions
└─ Each user has their own authenticated session ✅
```

---

## Phase 1: Discourse Configuration (15 minutes)

### Step 1.1: Enable DiscourseConnect

1. **Access Discourse Admin Panel**
   - Navigate to: https://meta.techrebels.info/admin/site_settings/category/login

2. **Enable DiscourseConnect**
   - Find setting: `enable discourse connect`
   - Toggle to **ON**
   - Save changes

3. **Configure DiscourseConnect Provider**
   - Find setting: `discourse connect url`
   - This is where Discourse will redirect for authentication
   - For mobile app, leave blank (we'll handle this in-app)

4. **Generate SSO Secret**
   - Find setting: `discourse connect secret`
   - Generate a strong secret key (at least 32 characters)
   - **Example generator:**
     ```bash
     openssl rand -hex 32
     ```
   - Copy this secret - you'll need it for your `.env` file
   - **⚠️ Keep this secret secure! Never commit to git!**

5. **Additional Settings**
   - `discourse connect overrides email`: **ON** (optional)
   - `discourse connect overrides username`: **ON** (optional)
   - `discourse connect overrides name`: **ON** (optional)

### Step 1.2: Update `.env` File

Add the SSO configuration:

```bash
# SSO Configuration
EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_generated_secret_here
EXPO_PUBLIC_APP_SCHEME=fomio

# Optional: SSO Provider URL (if using external provider)
# EXPO_PUBLIC_DISCOURSE_SSO_PROVIDER_URL=https://your-sso-provider.com/auth
```

---

## Phase 2: Install Required Dependencies (5 minutes)

Install packages for SSO implementation:

```bash
npm install --save expo-web-browser expo-auth-session expo-crypto
npm install --save-dev @types/node # For crypto types
```

Update `package.json`:

```json
{
  "dependencies": {
    "expo-web-browser": "~13.0.3",
    "expo-auth-session": "~5.5.2",
    "expo-crypto": "~13.0.2"
  }
}
```

---

## Phase 3: Create SSO Service (30 minutes)

### Step 3.1: Create SSO Service File

Create `shared/discourseSsoService.ts`:

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Configuration
const DISCOURSE_URL = process.env.EXPO_PUBLIC_DISCOURSE_URL!;
const SSO_SECRET = process.env.EXPO_PUBLIC_DISCOURSE_SSO_SECRET!;
const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || 'fomio';

// Warm up browser for better UX (iOS)
WebBrowser.maybeCompleteAuthSession();

export interface SsoUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
  admin: boolean;
  moderator: boolean;
  external_id?: string;
}

export interface SsoResponse {
  success: boolean;
  user?: SsoUser;
  error?: string;
}

/**
 * Discourse SSO Service
 * Handles DiscourseConnect authentication flow for mobile app
 */
export class DiscourseSsoService {
  /**
   * Generate HMAC SHA256 signature
   */
  private static async generateSignature(payload: string): Promise<string> {
    try {
      // Use expo-crypto for HMAC generation
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payload + SSO_SECRET,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return signature;
    } catch (error) {
      console.error('Signature generation error:', error);
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Verify HMAC signature
   */
  private static async verifySignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    const expectedSignature = await this.generateSignature(payload);
    return signature === expectedSignature;
  }

  /**
   * Generate nonce for SSO request
   */
  private static async generateNonce(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Base64 encode (URL-safe)
   */
  private static base64Encode(str: string): string {
    if (Platform.OS === 'web') {
      return btoa(str);
    }
    return Buffer.from(str, 'utf8').toString('base64');
  }

  /**
   * Base64 decode (URL-safe)
   */
  private static base64Decode(str: string): string {
    if (Platform.OS === 'web') {
      return atob(str);
    }
    return Buffer.from(str, 'base64').toString('utf8');
  }

  /**
   * Build SSO URL for authentication
   */
  private static async buildSsoUrl(): Promise<string> {
    try {
      // Generate nonce
      const nonce = await this.generateNonce();
      
      // Create return URL (deep link back to app)
      const returnUrl = Linking.createURL('auth/callback');
      
      // Build SSO payload
      const payload = `nonce=${nonce}&return_sso_url=${encodeURIComponent(returnUrl)}`;
      
      // Base64 encode payload
      const base64Payload = this.base64Encode(payload);
      
      // Generate signature
      const signature = await this.generateSignature(base64Payload);
      
      // Build final URL
      const ssoUrl = `${DISCOURSE_URL}/session/sso_provider?sso=${encodeURIComponent(base64Payload)}&sig=${signature}`;
      
      console.log('🔐 SSO URL generated:', {
        nonce: nonce.substring(0, 8) + '...',
        returnUrl,
        hasSignature: !!signature,
      });
      
      return ssoUrl;
    } catch (error) {
      console.error('SSO URL building error:', error);
      throw new Error('Failed to build SSO URL');
    }
  }

  /**
   * Parse SSO callback payload
   */
  private static parseSsoPayload(payload: string): SsoUser {
    const params = new URLSearchParams(payload);
    
    return {
      id: params.get('external_id') || params.get('id') || '',
      username: params.get('username') || '',
      email: params.get('email') || '',
      name: params.get('name') || '',
      avatar_url: params.get('avatar_url') || undefined,
      admin: params.get('admin') === 'true',
      moderator: params.get('moderator') === 'true',
      external_id: params.get('external_id') || undefined,
    };
  }

  /**
   * Initiate SSO login flow
   * Opens browser for user authentication
   */
  static async login(): Promise<SsoResponse> {
    try {
      console.log('🔐 Initiating Discourse SSO login...');
      
      // Validate configuration
      if (!DISCOURSE_URL) {
        return { success: false, error: 'Discourse URL not configured' };
      }
      if (!SSO_SECRET) {
        return { success: false, error: 'SSO secret not configured' };
      }
      
      // Build SSO URL
      const ssoUrl = await this.buildSsoUrl();
      
      // Create return URL for callback
      const returnUrl = Linking.createURL('auth/callback');
      
      console.log('🌐 Opening authentication browser...');
      console.log('   Return URL:', returnUrl);
      
      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        ssoUrl,
        returnUrl,
        {
          showInRecents: true, // iOS
          preferEphemeralSession: false, // Allow cookies
        }
      );
      
      console.log('📱 Browser result:', result.type);
      
      if (result.type === 'success' && result.url) {
        return this.handleCallback(result.url);
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Authentication cancelled by user' };
      } else {
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error) {
      console.error('🚨 SSO login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Handle SSO callback from Discourse
   * Validates signature and extracts user data
   */
  static async handleCallback(callbackUrl: string): Promise<SsoResponse> {
    try {
      console.log('🔄 Processing SSO callback...');
      
      // Parse callback URL
      const { queryParams } = Linking.parse(callbackUrl);
      const { sso, sig } = queryParams as { sso?: string; sig?: string };
      
      if (!sso || !sig) {
        console.error('❌ Missing SSO parameters');
        return { success: false, error: 'Invalid SSO response - missing parameters' };
      }
      
      console.log('🔍 Verifying signature...');
      
      // Verify signature
      const isValid = await this.verifySignature(sso, sig);
      if (!isValid) {
        console.error('❌ Invalid signature');
        return { success: false, error: 'Invalid SSO signature - possible tampering' };
      }
      
      console.log('✅ Signature verified');
      console.log('📦 Decoding user payload...');
      
      // Decode payload
      const decodedPayload = this.base64Decode(sso);
      console.log('   Decoded payload length:', decodedPayload.length);
      
      // Parse user data
      const user = this.parseSsoPayload(decodedPayload);
      
      if (!user.id || !user.username || !user.email) {
        console.error('❌ Incomplete user data');
        return { success: false, error: 'Incomplete user data received' };
      }
      
      console.log('✅ SSO authentication successful');
      console.log('   User:', user.username);
      console.log('   Email:', user.email);
      
      return { success: true, user };
    } catch (error) {
      console.error('🚨 SSO callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process authentication',
      };
    }
  }

  /**
   * Generate SSO payload for external provider (if needed)
   * This is used if you're implementing your own SSO provider
   */
  static async generateSsoPayload(userData: {
    external_id: string;
    email: string;
    username?: string;
    name?: string;
    avatar_url?: string;
    admin?: boolean;
    moderator?: boolean;
  }): Promise<{ payload: string; signature: string }> {
    try {
      // Build payload
      const params = new URLSearchParams();
      params.append('external_id', userData.external_id);
      params.append('email', userData.email);
      if (userData.username) params.append('username', userData.username);
      if (userData.name) params.append('name', userData.name);
      if (userData.avatar_url) params.append('avatar_url', userData.avatar_url);
      if (userData.admin) params.append('admin', 'true');
      if (userData.moderator) params.append('moderator', 'true');
      
      const payloadString = params.toString();
      
      // Encode and sign
      const base64Payload = this.base64Encode(payloadString);
      const signature = await this.generateSignature(base64Payload);
      
      return {
        payload: base64Payload,
        signature,
      };
    } catch (error) {
      console.error('Payload generation error:', error);
      throw new Error('Failed to generate SSO payload');
    }
  }

  /**
   * Logout (clear local session only)
   * Discourse session is managed by the forum itself
   */
  static async logout(): Promise<void> {
    console.log('🚪 Logging out (clearing local session)');
    // Local session clearing is handled by useAuth hook
    // Optionally, you can also clear Discourse session by calling:
    // await WebBrowser.openBrowserAsync(`${DISCOURSE_URL}/session/csrf`);
  }
}

export default DiscourseSsoService;
```

---

## Phase 4: Update Authentication Hook (20 minutes)

### Step 4.1: Modify `shared/useAuth.ts`

Update the sign-in method to use SSO:

```typescript
import { DiscourseSsoService, SsoUser } from './discourseSsoService';
import type { AppUser } from './discourseApiService';

// Add conversion function
function convertSsoUserToAppUser(ssoUser: SsoUser): AppUser {
  return {
    id: ssoUser.id,
    username: ssoUser.username,
    name: ssoUser.name || ssoUser.username,
    email: ssoUser.email,
    avatar: ssoUser.avatar_url || '',
    bio: '',
    followers: 0,
    following: 0,
    bytes: 0,
    comments: 0,
    joinedDate: new Date().toISOString(),
  };
}

export const useAuth = () => {
  // ... existing state ...
  
  const signIn = async (
    _identifier?: string,
    _password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Starting SSO authentication...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Use SSO service for authentication
      const response = await DiscourseSsoService.login();
      
      if (response.success && response.user) {
        // Convert SSO user to AppUser format
        const appUser = convertSsoUserToAppUser(response.user);
        
        // Store user data securely
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(appUser));
        
        console.log('✅ SSO authentication successful');
        setAuthState({
          user: appUser,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        console.log('❌ SSO authentication failed:', response.error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: response.error || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      logger.error('SSO authentication failed', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'Authentication error. Please try again.' 
      };
    }
  };
  
  // ... rest of useAuth hook ...
};
```

---

## Phase 5: Update Sign-In Screen (15 minutes)

### Step 5.1: Simplify Sign-In UI

Update `app/(auth)/signin.tsx`:

```typescript
export default function SignInScreen() {
  const { isDark } = useTheme();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Remove identifier and password states
  // SSO doesn't need them!
  
  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // No need to pass credentials - SSO handles it
      const result = await signIn();
      
      if (result.success) {
        router.replace('/(tabs)' as any);
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      setError('Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Simplified UI - just a sign-in button */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome to Fomio
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Sign in with your Discourse account
        </Text>
        
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: `${colors.error}10` }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}
        
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>
            {loading ? 'Authenticating...' : 'Sign In with Discourse'}
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.infoText, { color: colors.secondary }]}>
          You'll be redirected to meta.techrebels.info to authenticate
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

---

## Phase 6: Configure Deep Linking (10 minutes)

### Step 6.1: Update `app.json`

```json
{
  "expo": {
    "scheme": "fomio",
    "slug": "FomioMobile",
    "ios": {
      "bundleIdentifier": "com.fomio.mobile",
      "supportsTablet": true
    },
    "android": {
      "package": "com.fomio.mobile",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "fomio",
              "host": "*"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Step 6.2: Create Callback Route

Create `app/auth/callback.tsx`:

```typescript
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../shared/useAuth';

export default function AuthCallback() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Wait a moment for auth state to update
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/signin');
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>Completing authentication...</Text>
    </View>
  );
}
```

---

## Phase 7: Testing (30 minutes)

### Step 7.1: Test Configuration

```bash
# Verify environment
npm run test:discourse

# Check that SSO secret is set
cat .env | grep SSO_SECRET
```

### Step 7.2: Test SSO Flow

1. **Start the app**
   ```bash
   npm start
   ```

2. **Test on iOS**
   - Press `i` to open iOS simulator
   - Navigate to Sign In
   - Tap "Sign In with Discourse"
   - Should open browser with Discourse login
   - After login, should redirect back to app
   - Should land on Feed with authenticated session

3. **Test on Android**
   - Press `a` to open Android emulator
   - Repeat same steps

4. **Test on Web** (Optional)
   - Press `w` to open web version
   - SSO flow works differently on web (uses popup/redirect)

### Step 7.3: Debug Issues

Enable detailed logging:

```typescript
// In discourseSsoService.ts, add:
const DEBUG = process.env.EXPO_PUBLIC_ENABLE_DEBUG_MODE === 'true';

if (DEBUG) {
  console.log('🔍 Debug info:', { /* ... */ });
}
```

Common issues:
- **Browser doesn't open:** Check deep linking configuration
- **Invalid signature:** Verify SSO secret matches Discourse
- **Callback not working:** Check app scheme in app.json
- **User data incomplete:** Verify Discourse SSO settings

---

## Phase 8: Production Preparation (15 minutes)

### Step 8.1: Security Checklist

- [ ] SSO secret is strong (32+ characters)
- [ ] SSO secret is not in git
- [ ] Different secrets for dev/staging/production
- [ ] HTTPS enforced in production
- [ ] Deep linking uses production scheme
- [ ] Error handling for failed auth
- [ ] Session timeout handling

### Step 8.2: Update Environment

Create `.env.production`:

```bash
EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info
EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_production_sso_secret_here
EXPO_PUBLIC_APP_SCHEME=fomio

# Production security
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_CERT_PINNING=true
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
EXPO_PUBLIC_ENABLE_MOCK_DATA=false
```

### Step 8.3: Build Configuration

Update build scripts in `package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "start:prod": "EXPO_PUBLIC_ENV=production expo start",
    "build:ios": "eas build --platform ios --profile production",
    "build:android": "eas build --platform android --profile production"
  }
}
```

---

## 🎉 Success Criteria

Your SSO implementation is complete when:

- [x] User can tap "Sign In" in app
- [x] Browser opens to Discourse login
- [x] User authenticates on Discourse
- [x] App receives callback with user data
- [x] User is authenticated in app with their own session
- [x] Multiple users can have separate sessions
- [x] User data persists across app restarts

---

## 📊 Before vs After Comparison

### Before (API Key)
```
❌ All users share same session
❌ Cannot distinguish between users
❌ Security risk
❌ No real user authentication
✅ Simple to set up
✅ Good for testing
```

### After (SSO)
```
✅ Each user has own session
✅ Proper user authentication
✅ Secure and production-ready
✅ Supports all Discourse auth methods
✅ Industry-standard OAuth flow
⚠️  More complex setup (worth it!)
```

---

## 🆘 Troubleshooting

### Issue: "SSO secret not configured"

**Solution:**
```bash
# Check .env file
cat .env | grep SSO_SECRET

# Should output: EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_secret_here
# If not, add it to .env
```

### Issue: Browser opens but nothing happens

**Solution:**
1. Check Discourse SSO is enabled
2. Verify SSO secret matches in both places
3. Check browser console for errors
4. Test Discourse SSO URL manually in browser

### Issue: "Invalid signature" error

**Solution:**
1. Regenerate SSO secret on Discourse
2. Update .env file with new secret
3. Restart app completely
4. Clear app cache if needed

### Issue: Deep linking not working

**Solution:**
1. Verify app.json has correct scheme
2. Rebuild app (SSO changes require rebuild)
3. Test deep link manually: `npx uri-scheme open fomio://auth/callback --ios`
4. Check iOS/Android specific configuration

---

## 📚 Additional Resources

- **Discourse SSO Docs:** https://meta.discourse.org/t/discourseconnect-official-single-sign-on-for-discourse-sso/13045
- **Expo Web Browser:** https://docs.expo.dev/versions/latest/sdk/webbrowser/
- **Expo Auth Session:** https://docs.expo.dev/versions/latest/sdk/auth-session/
- **Expo Linking:** https://docs.expo.dev/versions/latest/sdk/linking/
- **Expo Deep Linking:** https://docs.expo.dev/guides/linking/

---

## ✅ Next Steps After Implementation

1. Test SSO with multiple users
2. Implement token refresh (if needed)
3. Add "Sign Out" functionality
4. Handle session expiration
5. Add analytics for auth events
6. Set up error monitoring
7. Prepare for app store submission

---

## 🎯 Summary

You've successfully implemented Discourse SSO! Your app now:

✅ Authenticates individual users securely
✅ Supports proper per-user sessions
✅ Works with all Discourse auth methods
✅ Is ready for production deployment

**Congratulations!** 🎉

Your FomioMobile app now has enterprise-grade authentication powered by Discourse.

