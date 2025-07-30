# Discourse Authentication Setup Guide

## 🔧 Quick Setup

The authentication is failing because the Discourse API configuration is not set up. Here's how to fix it:

### 1. Create Environment File

Create a `.env` file in your project root:

```bash
# Copy the example file
cp env.example .env
```

### 2. Configure Your Discourse Instance

Edit the `.env` file with your actual Discourse instance details:

```env
# Your Discourse instance URL (must be HTTPS in production)
EXPO_PUBLIC_DISCOURSE_URL=https://your-discourse-instance.com

# Discourse API credentials (create these in your Discourse admin panel)
EXPO_PUBLIC_DISCOURSE_API_KEY=your_api_key_here
EXPO_PUBLIC_DISCOURSE_API_USERNAME=your_api_username_here

# Security Settings
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_CERT_PINNING=false
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true

# Development Settings (disable in production)
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_DATA=false
```

### 3. For Development/Testing

If you don't have a Discourse instance yet, you can:

#### Option A: Use Local Development
```env
EXPO_PUBLIC_DISCOURSE_URL=http://localhost:3000
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_DATA=true
```

#### Option B: Use a Public Discourse Instance
```env
EXPO_PUBLIC_DISCOURSE_URL=https://discuss.example.com
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
```

### 4. Restart Your Development Server

After creating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

### 5. Test Authentication

1. Open the app
2. Go to Profile tab
3. Try signing in with your Discourse credentials
4. Check the console logs for debugging information

## 🔍 Debugging

The app now includes enhanced logging. Check your console for:

- `🔐 Attempting login to: [URL]` - Shows which Discourse instance
- `📧 Login identifier: [email]` - Shows what's being sent
- `🌐 Making request to: [URL]` - Shows the actual API call
- `📡 Response status: [status]` - Shows the response
- `✅ Login successful` or `❌ Login failed: [error]` - Shows the result

## 🚨 Common Issues

### "Invalid username format"
- **Cause**: The API was trying to validate email as username
- **Fixed**: Updated login method to accept both email and username

### "Network error"
- **Cause**: Discourse URL is not accessible
- **Solution**: Check your Discourse URL and ensure it's running

### "HTTP 404"
- **Cause**: Discourse instance not found
- **Solution**: Verify the URL is correct

### "HTTP 401"
- **Cause**: Invalid credentials
- **Solution**: Check your username/email and password

## 📝 Next Steps

1. Set up your Discourse instance (if you don't have one)
2. Create API credentials in Discourse admin panel
3. Update the `.env` file with real values
4. Test authentication
5. Enjoy your fully functional Fomio app! 🎉

## 🆘 Still Having Issues?

If you're still having problems:

1. Check the console logs for detailed error messages
2. Verify your Discourse instance is running and accessible
3. Ensure your API credentials are correct
4. Try with `EXPO_PUBLIC_ENABLE_DEBUG_MODE=true` for more detailed logs 