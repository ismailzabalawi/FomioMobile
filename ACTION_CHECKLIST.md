# ✅ FomioMobile Setup Checklist

**Project:** FomioMobile → Discourse Integration  
**Backend:** https://meta.techrebels.info  
**Last Updated:** October 12, 2025

Use this checklist to track your progress setting up the Discourse integration.

---

## 🎯 Quick Reference

- **Phase 1:** Environment Setup (15 min) - **START HERE**
- **Phase 2:** SSO Implementation (2-4 hours) - Do this week
- **Phase 3:** Production Prep (4-8 hours) - Next sprint

---

## Phase 1: Environment Setup ⚡

**Goal:** Get your app connected to Discourse  
**Time:** 15 minutes  
**Priority:** 🔴 CRITICAL

### Step 1: Create Environment File

- [ ] Navigate to project directory
  ```bash
  cd "/Users/somacodes/Desktop/Fomio Archive/FomioMobile"
  ```

- [ ] Copy environment template
  ```bash
  cp env.example .env
  ```

- [ ] Verify .env was created
  ```bash
  ls -la | grep .env
  # Should show: .env and env.example
  ```

### Step 2: Generate Discourse API Key

- [ ] Open Discourse admin panel
  ```
  https://meta.techrebels.info/admin/api/keys
  ```

- [ ] Click **"New API Key"**

- [ ] Configure the key:
  - Description: `FomioMobile Development`
  - User Level: **"All Users"**
  - Scope: **"Global"** (or select specific resources)

- [ ] Click **"Save"**

- [ ] **IMMEDIATELY** copy the generated API key
  - ⚠️ You won't see it again!
  - Save it temporarily in a secure note

### Step 3: Configure Environment

- [ ] Open `.env` in your editor
  ```bash
  nano .env
  # or use your preferred editor
  ```

- [ ] Update these values:
  ```bash
  EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info
  EXPO_PUBLIC_DISCOURSE_API_KEY=paste_your_key_here
  EXPO_PUBLIC_DISCOURSE_API_USERNAME=Soma
  EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
  EXPO_PUBLIC_ENABLE_RATE_LIMITING=true
  EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
  EXPO_PUBLIC_ENABLE_MOCK_DATA=false
  ```

- [ ] Save the file (Ctrl+O, Enter, Ctrl+X for nano)

- [ ] Verify .env is NOT in git
  ```bash
  git status
  # .env should NOT appear in the list
  ```

### Step 4: Test Connection

- [ ] Run the connection test
  ```bash
  npm run test:discourse
  ```

- [ ] Check test results:
  - [ ] Configuration loaded ✅
  - [ ] Site is accessible ✅
  - [ ] API authentication successful ✅
  - [ ] Categories endpoint working ✅
  - [ ] Latest topics endpoint working ✅
  - [ ] Search endpoint working ✅

- [ ] If ANY test fails, check:
  - [ ] API key copied correctly (no spaces)
  - [ ] Username matches your Discourse username
  - [ ] meta.techrebels.info is accessible in browser

### Step 5: Start the App

- [ ] Start Expo development server
  ```bash
  npm start
  ```

- [ ] Check console output for:
  ```
  🔧 Discourse API Configuration:
    baseUrl: 'https://meta.techrebels.info'
    hasApiKey: true
    hasApiUsername: true
  ```

- [ ] Open the app:
  - [ ] Press `i` for iOS simulator
  - [ ] Press `a` for Android emulator
  - [ ] Press `w` for web browser

### Step 6: Verify Functionality

- [ ] Open the app and check:
  - [ ] App loads without errors
  - [ ] No "mock data" messages
  - [ ] Console shows Discourse API calls

- [ ] Navigate to Feed tab:
  - [ ] Should see real posts from meta.techrebels.info
  - [ ] Post titles are actual Discourse topics
  - [ ] Authors are real users
  - [ ] Can scroll through posts

- [ ] Try opening a post:
  - [ ] Tap on any post
  - [ ] Should see full post content
  - [ ] Comments section loads
  - [ ] Can see replies

### Phase 1 Success Criteria ✅

- [ ] `.env` file created with valid credentials
- [ ] All connection tests pass
- [ ] App starts without errors
- [ ] Feed shows real Discourse data (not mocks)
- [ ] Can navigate between posts
- [ ] Console logs show API calls to meta.techrebels.info

**If all checked:** 🎉 Phase 1 Complete! Proceed to Phase 2 when ready.

---

## Phase 2: SSO Implementation 🔐

**Goal:** Enable proper user authentication  
**Time:** 2-4 hours  
**Priority:** 🟡 HIGH (Required for production)

### Prerequisites Check

- [ ] Phase 1 completed successfully
- [ ] Admin access to Discourse instance
- [ ] Time allocated: 2-4 hours uninterrupted
- [ ] Read `DISCOURSE_SSO_IMPLEMENTATION.md`

### Step 1: Enable SSO on Discourse

- [ ] Open Discourse admin
  ```
  https://meta.techrebels.info/admin/site_settings/category/login
  ```

- [ ] Find and enable these settings:
  - [ ] `enable discourse connect` → **ON**
  - [ ] `discourse connect url` → (leave blank for now)

- [ ] Generate SSO secret:
  ```bash
  openssl rand -hex 32
  # Or use: https://www.random.org/strings/
  ```

- [ ] Copy the secret (64 characters)

- [ ] Paste into Discourse:
  - [ ] Find `discourse connect secret`
  - [ ] Paste your generated secret
  - [ ] Save changes

- [ ] ⚠️ **IMPORTANT:** Save this secret securely!

### Step 2: Update Environment

- [ ] Add SSO configuration to `.env`:
  ```bash
  # Add these lines to your .env file
  EXPO_PUBLIC_DISCOURSE_SSO_SECRET=your_generated_secret_here
  EXPO_PUBLIC_APP_SCHEME=fomio
  ```

- [ ] Save the file

- [ ] Verify .env still not in git
  ```bash
  git status
  ```

### Step 3: Install SSO Dependencies

- [ ] Install required packages:
  ```bash
  npm install expo-web-browser expo-auth-session expo-crypto
  ```

- [ ] Install dev dependencies:
  ```bash
  npm install --save-dev @types/node
  ```

- [ ] Verify installation:
  ```bash
  npm list expo-web-browser expo-auth-session expo-crypto
  ```

### Step 4: Implement SSO Service

- [ ] Create `shared/discourseSsoService.ts`
  - [ ] Copy code from `DISCOURSE_SSO_IMPLEMENTATION.md` Step 3.1
  - [ ] Save the file

- [ ] Update `shared/useAuth.ts`
  - [ ] Follow instructions in `DISCOURSE_SSO_IMPLEMENTATION.md` Step 4.1
  - [ ] Replace API key auth with SSO
  - [ ] Save changes

- [ ] Update `app/(auth)/signin.tsx`
  - [ ] Simplify UI (remove username/password fields)
  - [ ] Add "Sign In with Discourse" button
  - [ ] Follow code in `DISCOURSE_SSO_IMPLEMENTATION.md` Step 5.1

### Step 5: Configure Deep Linking

- [ ] Update `app.json`:
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

- [ ] Create `app/auth/callback.tsx`
  - [ ] Copy code from `DISCOURSE_SSO_IMPLEMENTATION.md` Step 6.2
  - [ ] Save file

### Step 6: Test SSO Flow

- [ ] Rebuild the app (deep linking requires rebuild):
  ```bash
  # Stop the server (Ctrl+C)
  rm -rf .expo
  npm start
  ```

- [ ] Test on iOS:
  - [ ] Press `i` to open iOS
  - [ ] Navigate to Sign In
  - [ ] Tap "Sign In with Discourse"
  - [ ] Browser should open
  - [ ] Sign in on Discourse
  - [ ] Should redirect back to app
  - [ ] Should land on Feed as authenticated user

- [ ] Test on Android:
  - [ ] Press `a` to open Android
  - [ ] Repeat same flow
  - [ ] Verify works correctly

- [ ] Test with multiple users:
  - [ ] Sign out
  - [ ] Sign in with different user
  - [ ] Verify sees different data

### Step 7: Debug Issues (if needed)

- [ ] If browser doesn't open:
  - [ ] Check deep linking: `npx uri-scheme list`
  - [ ] Verify app.json scheme is correct
  - [ ] Rebuild app completely

- [ ] If "Invalid signature" error:
  - [ ] Verify SSO secret matches in both places
  - [ ] Check for extra spaces in .env
  - [ ] Regenerate secret if needed

- [ ] If callback doesn't work:
  - [ ] Check deep linking setup
  - [ ] Verify callback.tsx exists
  - [ ] Check console for errors

### Phase 2 Success Criteria ✅

- [ ] SSO enabled on Discourse
- [ ] Dependencies installed
- [ ] SSO service implemented
- [ ] Deep linking configured
- [ ] User can sign in via browser
- [ ] App receives user data after auth
- [ ] Multiple users can sign in separately
- [ ] Each user sees their own data

**If all checked:** 🎉 Phase 2 Complete! You have proper authentication!

---

## Phase 3: Production Preparation 🚀

**Goal:** Prepare for app store deployment  
**Time:** 4-8 hours  
**Priority:** 🟢 MEDIUM (Before launch)

### Security Audit

- [ ] Review security settings:
  - [ ] HTTPS enforcement enabled
  - [ ] Debug mode disabled in production
  - [ ] Mock data disabled
  - [ ] Rate limiting enabled

- [ ] Create production .env:
  ```bash
  cp .env .env.production
  ```

- [ ] Update production settings:
  ```bash
  EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
  EXPO_PUBLIC_ENABLE_MOCK_DATA=false
  EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
  ```

- [ ] Generate new production API key:
  - [ ] Use separate key for production
  - [ ] Limit permissions appropriately
  - [ ] Document key location securely

- [ ] Rotate all secrets:
  - [ ] New SSO secret for production
  - [ ] New API key
  - [ ] Update Discourse settings

### Performance Optimization

- [ ] Implement offline support:
  - [ ] Add SQLite for local storage
  - [ ] Cache frequently accessed data
  - [ ] Handle offline scenarios

- [ ] Optimize images:
  - [ ] Add image compression
  - [ ] Implement lazy loading
  - [ ] Use optimized formats (WebP)

- [ ] Add request batching:
  - [ ] Group similar requests
  - [ ] Reduce API calls
  - [ ] Improve load times

- [ ] Profile performance:
  - [ ] Use React DevTools
  - [ ] Check render times
  - [ ] Optimize slow components

### Error Monitoring

- [ ] Set up Sentry:
  ```bash
  npm install @sentry/react-native
  ```

- [ ] Configure Sentry:
  - [ ] Create Sentry project
  - [ ] Add DSN to .env
  - [ ] Initialize in app
  - [ ] Test error reporting

- [ ] Add analytics:
  - [ ] Choose platform (Firebase, Mixpanel, etc.)
  - [ ] Install dependencies
  - [ ] Track key events
  - [ ] Monitor user flows

### Testing

- [ ] Unit tests:
  - [ ] Run test suite: `npm test`
  - [ ] Ensure coverage > 80%
  - [ ] Fix failing tests

- [ ] Integration tests:
  - [ ] Test auth flow
  - [ ] Test feed loading
  - [ ] Test post creation
  - [ ] Test comments

- [ ] E2E tests (optional):
  - [ ] Install Detox
  - [ ] Write critical path tests
  - [ ] Automate testing

- [ ] Manual testing:
  - [ ] Test on real iOS device
  - [ ] Test on real Android device
  - [ ] Test edge cases
  - [ ] Test offline behavior
  - [ ] Test slow network

### Build & Deploy

- [ ] Install EAS CLI:
  ```bash
  npm install -g eas-cli
  ```

- [ ] Configure EAS:
  ```bash
  eas build:configure
  ```

- [ ] Create build profiles:
  - [ ] Development build
  - [ ] Staging build
  - [ ] Production build

- [ ] Build for iOS:
  ```bash
  eas build --platform ios --profile production
  ```

- [ ] Build for Android:
  ```bash
  eas build --platform android --profile production
  ```

- [ ] Test builds:
  - [ ] Install on device
  - [ ] Test all features
  - [ ] Verify production settings

### App Store Preparation

- [ ] iOS App Store:
  - [ ] Create App Store Connect listing
  - [ ] Prepare screenshots
  - [ ] Write description
  - [ ] Set up in-app purchases (if needed)
  - [ ] Submit for review

- [ ] Android Play Store:
  - [ ] Create Play Console listing
  - [ ] Prepare screenshots
  - [ ] Write description
  - [ ] Set up billing (if needed)
  - [ ] Submit for review

### Phase 3 Success Criteria ✅

- [ ] Security audit passed
- [ ] Performance optimized
- [ ] Error monitoring active
- [ ] All tests passing
- [ ] Builds created successfully
- [ ] Tested on real devices
- [ ] Ready for store submission

**If all checked:** 🎉 Ready for Production!

---

## 📊 Progress Tracker

### Overall Status

```
Phase 1: [ ] Not Started  [ ] In Progress  [ ] Complete
Phase 2: [ ] Not Started  [ ] In Progress  [ ] Complete
Phase 3: [ ] Not Started  [ ] In Progress  [ ] Complete
```

### Time Spent

```
Phase 1: ___ minutes (Target: 15 min)
Phase 2: ___ hours   (Target: 2-4 hours)
Phase 3: ___ hours   (Target: 4-8 hours)
Total:   ___ hours   (Target: 6-12 hours)
```

### Issues Encountered

```
Date: __________
Issue: ___________________
Solution: _________________
Time Lost: _______________

Date: __________
Issue: ___________________
Solution: _________________
Time Lost: _______________
```

---

## 🆘 Quick Troubleshooting

### Common Issues

**Issue:** `.env` file not loaded
- **Fix:** Restart dev server completely
- **Check:** `console.log(process.env.EXPO_PUBLIC_DISCOURSE_URL)`

**Issue:** API calls failing
- **Fix:** Run `npm run test:discourse`
- **Check:** API key is correct and active

**Issue:** SSO browser not opening
- **Fix:** Rebuild app (deep linking requires rebuild)
- **Check:** Verify scheme in app.json

**Issue:** Invalid signature
- **Fix:** Verify SSO secrets match
- **Check:** No extra spaces in .env

---

## 📚 Documentation Reference

- **QUICK_START.md** - Quick setup guide
- **DISCOURSE_CONNECTION_AUDIT.md** - Technical details
- **DISCOURSE_SSO_IMPLEMENTATION.md** - SSO guide
- **ARCHITECTURE.md** - System architecture
- **AUDIT_SUMMARY.md** - Executive summary

---

## ✅ Final Checklist

Before considering the project complete:

- [ ] Phase 1 completed and verified
- [ ] Phase 2 completed and tested
- [ ] Phase 3 completed and ready for deployment
- [ ] All documentation reviewed
- [ ] Team members trained
- [ ] Monitoring systems active
- [ ] Rollback plan prepared
- [ ] Launch announcement ready

---

**Keep this checklist updated as you progress!**  
Mark items complete, note issues, and track your time.

Good luck! 🚀

