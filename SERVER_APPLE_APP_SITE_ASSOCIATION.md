# Server apple-app-site-association File Configuration

## Location

The `apple-app-site-association` file must be hosted at:
```
https://meta.fomio.app/.well-known/apple-app-site-association
```

## Important Requirements

1. **No file extension**: The URL must NOT have `.json` extension
2. **Content-Type**: Must be served as `application/json` (preferably without charset parameter)
3. **HTTPS only**: Must be accessible over HTTPS
4. **No redirects**: Must serve the file directly, not redirect to it
5. **Valid JSON**: Must be valid JSON (no comments, no trailing commas)

## File Contents

Copy this exact content to your server:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "LK9253R3XB.com.fomio.mobile",
        "paths": [
          "/t/*",
          "/u/*",
          "/c/*",
          "/teret/*",
          "/hub/*",
          "/byte/*",
          "/profile/*",
          "/search*"
        ]
      }
    ]
  }
}
```

## Path Patterns Explained

- `/t/*` - Discourse topic URLs (e.g., `/t/slug/123`) → Maps to Bytes in app
- `/u/*` - User profile URLs (e.g., `/u/username`) → Maps to Profiles in app
- `/c/*` - Category URLs (e.g., `/c/category-slug`) → Maps to Terets in app
- `/teret/*` - Fomio category URLs (if you use this format)
- `/hub/*` - Fomio parent category URLs
- `/byte/*` - Fomio byte URLs (if you use this format)
- `/profile/*` - Fomio profile URLs (if you use this format)
- `/search*` - Search URLs (with or without query params)

## Discourse Configuration

If you're using Discourse and it's auto-generating the file, you need to configure it to include `/t/*` in the paths. Check your Discourse settings for "Associated Domains" or "App Links" configuration.

Alternatively, if Discourse allows manual override, you can upload this file to:
- Discourse public directory (if accessible)
- Or configure your web server (nginx/apache) to serve this file directly from `/.well-known/apple-app-site-association`

## Nginx Configuration Example

If you need to serve this manually via nginx:

```nginx
location = /.well-known/apple-app-site-association {
    default_type application/json;
    add_header Content-Type application/json;
    return 200 '{"applinks":{"apps":[],"details":[{"appID":"LK9253R3XB.com.fomio.mobile","paths":["/t/*","/u/*","/c/*","/teret/*","/hub/*","/byte/*","/profile/*","/search*"]}]}}';
}
```

Or serve from a file:

```nginx
location = /.well-known/apple-app-site-association {
    alias /path/to/apple-app-site-association.json;
    default_type application/json;
    add_header Content-Type application/json;
}
```

## Verification

After uploading, verify it works:

```bash
# Check if file is accessible
curl -I https://meta.fomio.app/.well-known/apple-app-site-association

# Check content
curl -s https://meta.fomio.app/.well-known/apple-app-site-association | python3 -m json.tool

# Verify Content-Type
curl -sI https://meta.fomio.app/.well-known/apple-app-site-association | grep -i content-type
```

## Testing

After updating the server file:

1. **Clear iOS cache**: Delete and reinstall the app (iOS caches the association file)
2. **Wait a few minutes**: iOS may take a few minutes to re-fetch the file
3. **Test on device**: Open a link like `https://meta.fomio.app/t/welcome-to-fomio/1` in Safari
4. **Verify**: The link should open in your app, not Safari

## Team ID

Your Team ID: `LK9253R3XB`
Your Bundle ID: `com.fomio.mobile`
Your App ID: `LK9253R3XB.com.fomio.mobile`

Make sure these match your Apple Developer account configuration.

