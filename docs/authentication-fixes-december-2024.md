# Authentication Fixes - December 2024

## Overview

This document summarizes the comprehensive authentication fixes implemented to resolve platform-specific issues with Discourse User API Key authentication on both iOS and Android.

## Problems Identified

### Android Issues
1. **Deep Link Not Received**: Authentication process would start but return to sign-in page without completing
2. **WebView Not Rendering**: Component unmounting during async operations prevented WebView from displaying
3. **Route Configuration**: Incorrect route names causing navigation failures

### iOS Issues
1. **Base64 Decoding Errors**: Payload contained newlines and URL-encoded characters causing `atob` failures
2. **Crypto Decryption Failures**: RSA-OAEP padding scheme mismatches

### Cross-Platform Issues
1. **Double Processing**: Auth callback being processed multiple times on component remounts
2. **API Key Clearing**: Valid API keys being cleared on error during re-mounts
3. **Navigation Errors**: Using React Navigation `CommonActions.reset()` instead of Expo Router patterns
4. **Cookie-Based Auth Bypass**: App considered user authenticated if `/session/current.json` worked via cookies, even without stored User API Key
5. **WebView Opening External Browser**: `isAuthRedirect` check matched authorization URL parameters, causing the auth page to open in external browser

## Solutions Implemented

### 1. Android WebView Implementation

**File**: `app/(auth)/auth-modal.tsx`

- Switched Android authentication to use in-app `WebView` instead of external browser
- Fixed component unmounting issue by replacing `useState` with `useRef` for `authStarted` flag
- Added comprehensive logging for WebView navigation, load events, and message handling
- Implemented JavaScript injection to detect payload in WebView URL

**Key Changes**:
```typescript
// Changed from useState to useRef to prevent re-renders
const authStartedRef = useRef(false);

// Android-specific WebView rendering
if (Platform.OS === 'android' && webviewUrl) {
  return <WebView source={{ uri: webviewUrl }} ... />;
}
```

### 2. iOS Base64 Payload Normalization

**File**: `shared/userApiKeyManager.ts`

- Enhanced `normalizeBase64Payload()` to handle:
  - URL-encoded characters (`%` decoding)
  - Newlines and carriage returns (`\r\n`)
  - All whitespace characters (spaces, tabs, etc.)
  - URL-safe base64 conversion (`-` → `+`, `_` → `/`)
  - Padding correction

**Key Changes**:
```typescript
private static normalizeBase64Payload(input: string): string {
  // URL-decode if needed
  if (normalized.includes('%')) {
    normalized = decodeURIComponent(normalized);
  }
  // Remove all whitespace
  normalized = normalized.replace(/\s/g, '');
  // Convert URL-safe to standard base64
  normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  // ...
}
```

### 3. Crypto Decryption Improvements

**File**: `lib/crypto.ts`

- Added fallback decryption schemes for RSA-OAEP:
  1. SHA-256/SHA-256 (primary)
  2. SHA-256/SHA-1 (MGF1 fallback)
  3. PKCS#1 v1.5 (legacy fallback)

**File**: `lib/auth.ts`

- Changed to generate **fresh RSA keys and nonce** for each auth attempt
- Prevents key mismatch issues from stale/corrupted stored keys

**Key Changes**:
```typescript
// Always generate fresh keys for each auth attempt
const keyPair = await UserApiKeyManager.generateKeyPair();
const nonce = await UserApiKeyManager.generateNonce();
```

### 4. Double-Processing Prevention

**File**: `app/auth/callback.tsx`

- Added global flags (`globalCallbackProcessing`, `globalCallbackProcessed`) that persist across component remounts
- Added early return checks at multiple points in the callback flow
- Improved error handling to not clear API keys if already successfully processed

**Key Changes**:
```typescript
// Global flags to prevent double-processing
let globalCallbackProcessing = false;
let globalCallbackProcessed = false;

// Early return if already processed
if (globalCallbackProcessed) {
  router.replace('/(tabs)');
  return;
}
```

### 5. Route Configuration Fixes

**File**: `app/(auth)/_layout.tsx`

- Added `/auth/callback`, `/callback`, and `/auth_redirect` to explicit auth screens list
- Prevents AuthLayout from redirecting callback route during processing

**File**: `app/_layout.tsx`

- Corrected route name from `auth` to `auth/callback` in Stack configuration

### 6. Navigation Fixes

**File**: `app/(auth)/auth-modal.tsx`

- Replaced `CommonActions.reset()` with `router.replace()` for Expo Router compatibility
- Removed unused `CommonActions` import

**Key Changes**:
```typescript
// Before (React Navigation - doesn't work with Expo Router)
rootNavigation.dispatch(CommonActions.reset({ ... }));

// After (Expo Router)
router.replace('/(tabs)' as any);
```

### 7. TypeScript Configuration

**File**: `tsconfig.json`

- Changed `moduleResolution` from `"node"` to `"bundler"` to support Expo SDK 54+ `customConditions`
- Moved `extends` to top of file (standard practice)

### 8. Error Logging Improvements

**File**: `shared/userApiKeyManager.ts`

- Changed crypto fallback errors from `ERROR` to `WARN` level (expected behavior)
- Improved error messages to handle `null` errors gracefully

### 9. WebView External Browser Fix

**File**: `app/(auth)/auth-modal.tsx`

- **Problem**: WebView was opening the authorization page in an external browser instead of staying in-app
- **Cause**: The `isAuthRedirect` check used `url.includes('auth_redirect')` which matched the authorization URL that **contains** `auth_redirect` as a parameter value (`redirect_uri=fomio://auth_redirect`)
- **Result**: User would log in twice - once in WebView, once in external browser. The external browser session couldn't return the API key to the app

**Solution**: Changed to only match URLs that **start with** `fomio://`:
```typescript
// OLD - matches authorization page URL that contains redirect_uri parameter
const isAuthRedirect = url.startsWith('fomio://') || url.includes('auth_redirect');

// NEW - only matches the actual redirect URL
const isCustomSchemeRedirect = url.startsWith('fomio://');
```

### 10. Auth State Verification Fix

**File**: `shared/useAuth.ts`

- **Problem**: App considered user authenticated if `/session/current.json` worked via cookies, even without a stored User API Key
- **Cause**: WebView auth created Discourse session cookies, but if the callback wasn't processed properly, the User API Key was never stored
- **Result**: App loaded as if authenticated, but all authenticated API operations failed (no `User-Api-Key` header)

**Solution**: Now checks for a stored User API Key **before** making any API call:
```typescript
// CRITICAL: First check if we have a stored User API Key
const credentials = await UserApiKeyManager.getAuthCredentials();
const hasStoredApiKey = !!(credentials?.key);

if (!hasStoredApiKey) {
  // No API key stored - force re-authentication
  set({ isLoading: false, isAuthenticated: false, user: null });
  return;
}
```

## Files Modified

1. `app/(auth)/auth-modal.tsx` - Android WebView implementation, navigation fixes
2. `app/auth/callback.tsx` - Double-processing prevention, error handling
3. `app/(auth)/_layout.tsx` - Route configuration
4. `app/_layout.tsx` - Stack route names
5. `lib/auth.ts` - Fresh key generation, redirect URI handling, processAuthPayload()
6. `lib/crypto.ts` - Decryption fallback schemes
7. `shared/userApiKeyManager.ts` - Base64 normalization, error handling
8. `shared/useAuth.ts` - Auth state verification (check for stored API key)
9. `shared/discourseApi.ts` - Fixed 403 permission error handling
10. `tsconfig.json` - Module resolution configuration
11. `app/auth/callback.tsx` - Existing callback screen (now a fallback for deep links)

### 10. Direct Payload Processing (Callback Navigation Fix)

**Files**: `app/(auth)/auth-modal.tsx`, `lib/auth.ts`

- Added `processAuthPayload()` function to `lib/auth.ts` to handle payload decryption, nonce verification, and API key storage in one place
- Modified `auth-modal.tsx` to process the payload directly instead of navigating to a separate callback screen
- This fixes the issue where navigation from a modal to `/auth/callback` was failing silently
- The modal now shows a loading state while processing and navigates to tabs on success

**Root Cause**: When `router.replace('/auth/callback?...')` was called from within a fullscreen modal, the navigation was failing - the modal would dismiss but the callback screen never mounted.

**Solution**: Process the authentication payload directly in the modal using the new `processAuthPayload()` helper function, eliminating the need for cross-route navigation during the auth flow.

**Key Changes**:
```typescript
// New function in lib/auth.ts
export async function processAuthPayload(encryptedPayload: string): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  // Decrypt payload, verify nonce, store API key
  // Returns success/failure with user info
}

// In auth-modal.tsx - direct processing instead of navigation
const handleAuthPayload = useCallback(async (payload: string) => {
  const result = await processAuthPayload(payload);
  if (result.success) {
    // Update auth context and navigate to tabs
    router.replace('/(tabs)');
  }
}, []);
```

## Testing Recommendations

1. **Android**:
   - Test sign-in flow with WebView
   - Verify payload is processed directly in modal (no navigation to callback)
   - Confirm navigation to tabs after successful auth
   - Check that API key is stored correctly

2. **iOS**:
   - Test sign-in flow with `ASWebAuthenticationSession`
   - Verify base64 payload decoding with various URL encodings
   - Confirm navigation to tabs after successful auth

3. **Cross-Platform**:
   - Test rapid sign-in attempts (should not double-process)
   - Verify API keys persist after successful authentication
   - Test error recovery (invalid credentials, network failures)

### 11. Permission Error Handling Fix

**File**: `shared/discourseApi.ts`

- Fixed issue where 403 "permission denied" errors were incorrectly clearing valid API keys
- The code now distinguishes between:
  - **401 Unauthorized**: API key is invalid/expired → Clear the key
  - **403 Forbidden with permission error**: User lacks permission for THIS action → Keep the key
  - **403 without clear permission message**: Treat as auth failure → Clear the key
- This prevents losing a valid session when the user simply can't perform a specific action

**Key Changes**:
```typescript
// Don't clear keys for permission errors - these mean the API key is VALID
// but the user doesn't have permission for this specific action
const isAuthFailure = response.status === 401;
const shouldClearKeys = !isCsrfError && !isPermissionError && isAuthFailure;
```

## Security Considerations

- **Nonce Verification**: Maintained to prevent replay attacks
- **Fresh Keys**: Each auth attempt generates new RSA keypair (prevents key reuse)
- **Secure Storage**: Private keys stored in `expo-secure-store`
- **Error Handling**: Invalid API keys are cleared, but valid keys are protected from accidental clearing
- **Permission Errors**: 403 "permission denied" errors no longer clear valid API keys

## Breaking Changes

None. All changes are backward compatible.

## Related Issues

- Android authentication not completing
- iOS base64 decoding errors
- Double-processing of auth callbacks
- Navigation stack reset errors

## Commit Message Suggestion

```
fix(auth): resolve platform-specific authentication issues

- Implement WebView-based auth for Android (mirrors DiscourseMobile approach)
- Fix iOS base64 payload normalization (handle newlines and URL encoding)
- Add crypto decryption fallbacks (RSA-OAEP with multiple padding schemes)
- Prevent double-processing of auth callbacks with global flags
- Fix navigation to use Expo Router patterns instead of React Navigation
- Generate fresh RSA keys for each auth attempt
- Verify stored User API Key before considering user authenticated
- Fix WebView opening external browser due to overly broad URL matching
- Process auth payload directly in modal (fixes callback navigation failure)
- Add processAuthPayload() helper function for reusable auth completion
- Fix 403 permission errors incorrectly clearing valid API keys
- Improve error handling and logging

Fixes authentication failures on both iOS and Android platforms.
```

