# 🚀 Quick Start Guide - Discourse Connection

## ⚡ Get Connected in 5 Minutes

This guide will help you connect FomioMobile to your Discourse backend at **https://meta.techrebels.info** immediately.

---

## Step 1: Create API Key on Discourse (2 minutes)

1. **Log in to Discourse Admin Panel**
   - Go to: https://meta.techrebels.info/admin/api/keys
   - Sign in with your admin account

2. **Create New API Key**
   - Click **"New API Key"** button
   - Fill in the form:
     - **Description:** `FomioMobile Development`
     - **User Level:** Select **"All Users"** (gives full access)
     - **Scope:** Leave as **"Global"** or select specific resources
   - Click **"Save"**

3. **Copy the API Key**
   - ⚠️ Important: Copy the key immediately (you won't see it again!)
   - Save it temporarily in a secure place

---

## Step 2: Set Up Environment Variables (2 minutes)

1. **Create `.env` file**
   ```bash
   cd /Users/somacodes/Desktop/Fomio\ Archive/FomioMobile
   cp env.example .env
   ```

2. **Edit `.env` file with your credentials**
   
   Open `.env` in your editor and update these values:
   
   ```bash
   # Replace these values with your actual credentials
   EXPO_PUBLIC_DISCOURSE_URL=https://meta.techrebels.info
   EXPO_PUBLIC_DISCOURSE_API_KEY=paste_your_api_key_here
   EXPO_PUBLIC_DISCOURSE_API_USERNAME=Soma
   
   # Keep these as-is for now
   EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
   EXPO_PUBLIC_ENABLE_RATE_LIMITING=true
   EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
   EXPO_PUBLIC_ENABLE_MOCK_DATA=false
   ```

3. **Save the file**

---

## Step 3: Test the Connection (1 minute)

Run the connection test script:

```bash
node scripts/test-auth.js
```

**Expected Output:**
```
🔧 Testing Discourse API Connection...
✅ Configuration loaded
✅ Connected to Discourse
✅ Authenticated as: Soma
✅ All tests passed!
```

If you see errors, check:
- API key is correct
- Username matches your Discourse admin username
- meta.techrebels.info is accessible

---

## Step 4: Start the App

```bash
# Stop any running server (Ctrl+C)
npm start
```

Then press:
- **`i`** for iOS simulator
- **`a`** for Android emulator
- **`w`** for web browser

---

## Step 5: Verify It's Working

1. **Open the app**

2. **Check the console logs**
   - Look for: `🔧 Discourse API Configuration:`
   - Should show:
     ```
     baseUrl: 'https://meta.techrebels.info'
     hasApiKey: true
     hasApiUsername: true
     ```

3. **Navigate to Feed**
   - You should see real posts from meta.techrebels.info
   - Not mock data!

4. **Test Sign In** (Read-Only Mode)
   - Tap on Profile tab
   - The app will use your API key to authenticate
   - You should see your Discourse profile data

---

## ✅ Success Checklist

- [ ] Created API key on Discourse admin panel
- [ ] Created `.env` file with credentials
- [ ] Ran `node scripts/test-auth.js` successfully
- [ ] Restarted development server
- [ ] Can see real Discourse posts in Feed
- [ ] Console shows correct configuration

---

## 🚨 Troubleshooting

### Error: "Invalid API key" or "401 Unauthorized"

**Solution:**
1. Verify API key is correct (no extra spaces)
2. Ensure username matches Discourse admin username
3. Regenerate API key if needed

### Error: "Network request failed" or "Cannot connect"

**Solution:**
1. Check that https://meta.techrebels.info is accessible in your browser
2. Verify you're not behind a firewall
3. Check your internet connection
4. Try disabling VPN if you have one

### Error: "CORS error" (on web only)

**Solution:**
1. Go to Discourse admin: https://meta.techrebels.info/admin/site_settings/category/security
2. Find "cors origins" setting
3. Add: `http://localhost:8081`
4. Save changes

### App shows mock data instead of real posts

**Solution:**
1. Check `.env` file has `EXPO_PUBLIC_ENABLE_MOCK_DATA=false`
2. Restart the development server completely
3. Clear app cache: Stop server → Delete `.expo` folder → Restart

### Script error: "Cannot find module 'dotenv'"

**Solution:**
```bash
npm install dotenv
```

---

## 📊 What You Can Do Now (Read-Only Mode)

With the current setup, you can:

✅ **View Posts** - See all topics from your Discourse forum
✅ **View Comments** - Read post replies
✅ **View Profiles** - See user profiles
✅ **Search** - Search topics and users
✅ **View Categories** - Browse all categories (your "Hubs")
✅ **View Notifications** - See your notifications

### ⚠️ Limitations (Current Setup)

❌ **Cannot create posts** - API key is for reading only
❌ **Cannot like posts** - Requires user-specific authentication
❌ **All users see same data** - Everyone authenticated as same admin user
❌ **Cannot distinguish between users** - No per-user sessions

---

## 🔄 Next Steps

### For Full User Authentication

Your current setup is great for **testing and development**, but for a **production app with multiple users**, you need to implement **Discourse SSO**.

**Why?**
- Currently, all users share the same admin API key
- Cannot track individual user actions
- Security risk: Anyone can impersonate admin

**Solution: Implement Discourse SSO (DiscourseConnect)**

Follow the detailed guide in: [`DISCOURSE_CONNECTION_AUDIT.md`](./DISCOURSE_CONNECTION_AUDIT.md#phase-2-implement-discourse-sso-recommended)

**Estimated Time:** 2-4 hours
**Complexity:** Medium
**Priority:** Required before production launch

---

## 📚 Additional Resources

- **Full Audit Report:** [`DISCOURSE_CONNECTION_AUDIT.md`](./DISCOURSE_CONNECTION_AUDIT.md)
- **Environment Setup:** [`SETUP_DISCOURSE_AUTH.md`](./SETUP_DISCOURSE_AUTH.md)
- **Integration Status:** [`DISCOURSE_INTEGRATION_COMPLETE.md`](./DISCOURSE_INTEGRATION_COMPLETE.md)
- **Discourse API Docs:** https://docs.discourse.org/

---

## 🆘 Need Help?

If you're stuck:

1. Check console logs for detailed error messages
2. Run diagnostic: `node scripts/test-auth.js`
3. Review `DISCOURSE_CONNECTION_AUDIT.md` for troubleshooting
4. Verify Discourse instance is online: https://meta.techrebels.info

---

## 🎉 You're All Set!

Your FomioMobile app is now connected to Discourse! 🚀

You can now:
- Browse real posts from your forum
- Test all read functionality
- Start building out the UI with real data
- Plan your SSO implementation for production

**Happy coding!** 💻✨

