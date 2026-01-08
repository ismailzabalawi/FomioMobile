# Server assetlinks.json File Configuration (Android App Links)

## Location

The `assetlinks.json` file must be hosted at:
```
https://meta.fomio.app/.well-known/assetlinks.json
```

## Important Requirements

1. **File extension**: The URL MUST have `.json` extension (unlike iOS)
2. **Content-Type**: Must be served as `application/json`
3. **HTTPS only**: Must be accessible over HTTPS
4. **No redirects**: Must serve the file directly, not redirect to it
5. **Valid JSON**: Must be valid JSON array (starts with `[`, not `{`)

## File Contents

Copy this exact content to your server:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.fomio.mobile",
    "sha256_cert_fingerprints": [
      "01584EDB4544A6FF9204A6FADD4C860C9D9BCA52D478A4B2D0CA2E2A8993F051"
    ]
  }
}]
```

## Key Differences from iOS

**Android App Links** work differently than iOS Universal Links:

1. **No path filtering in assetlinks.json**: The `assetlinks.json` file only verifies that your app is authorized for the domain. It does NOT specify which paths to handle.

2. **Paths controlled by intent filters**: The paths your app handles are specified in the Android app's `AndroidManifest.xml` (configured via `app.json` in Expo), not in the `assetlinks.json` file.

3. **Package name + fingerprint**: Android verifies the app by matching:
   - `package_name`: Your app's package name (`com.fomio.mobile`)
   - `sha256_cert_fingerprints`: SHA256 fingerprint of your app's signing certificate

## App Configuration (app.json)

Your app's intent filters in `app.json` control which URLs are handled:

```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "meta.fomio.app"
          }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

The `autoVerify: true` flag tells Android to verify the `assetlinks.json` file automatically.

## URL Patterns Handled

Android will handle ALL paths under `https://meta.fomio.app/*` because:
- The intent filter specifies `host: "meta.fomio.app"` with no path restrictions
- The app code converts HTTPS URLs to internal routes (same as iOS)

The app handles these URL patterns (converted in code):
- `/t/{slug}/{id}` and `/t/{id}` → Bytes (`/feed/{id}`)
- `/u/{username}` → Profiles (`/profile/{username}`)
- `/c/{slug}` → Terets (`/teret/{slug}`)
- `/search` → Search (`/search`)

## Multiple Build Variants

If you have multiple build variants (development, staging, production) with different package names or signing keys, you can add multiple entries:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.fomio.mobile",
      "sha256_cert_fingerprints": [
        "01584EDB4544A6FF9204A6FADD4C860C9D9BCA52D478A4B2D0CA2E2A8993F051"
      ]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.fomio.mobile.debug",
      "sha256_cert_fingerprints": [
        "DEBUG_FINGERPRINT_HERE"
      ]
    }
  }
]
```

## Getting Your SHA256 Fingerprint

### For Development/Release Builds (EAS):

```bash
# Check your EAS credentials
eas credentials -p android

# Look for the SHA256 fingerprint in the keystore information
```

### For Local Debug Builds:

```bash
# Get debug keystore fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

### For Custom Keystore:

```bash
keytool -list -v -keystore /path/to/keystore.jks -alias your-alias | grep SHA256
```

**Important**: The fingerprint must match EXACTLY (including uppercase/lowercase). The fingerprint shown above is from your EAS production keystore.

## Nginx Configuration Example

If you need to serve this manually via nginx:

```nginx
location = /.well-known/assetlinks.json {
    default_type application/json;
    add_header Content-Type application/json;
    return 200 '[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.fomio.mobile","sha256_cert_fingerprints":["01584EDB4544A6FF9204A6FADD4C860C9D9BCA52D478A4B2D0CA2E2A8993F051"]}}]';
}
```

Or serve from a file:

```nginx
location = /.well-known/assetlinks.json {
    alias /path/to/assetlinks.json;
    default_type application/json;
    add_header Content-Type application/json;
}
```

## Verification

After uploading, verify it works:

```bash
# Check if file is accessible
curl -I https://meta.fomio.app/.well-known/assetlinks.json

# Check content
curl -s https://meta.fomio.app/.well-known/assetlinks.json | python3 -m json.tool

# Verify Content-Type
curl -sI https://meta.fomio.app/.well-known/assetlinks.json | grep -i content-type

# Use Google's verification API
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://meta.fomio.app&relation=delegate_permission/common.handle_all_urls"
```

## Testing

After updating the server file and building the app:

1. **Install the app** on an Android device/emulator
2. **Verify domain association**:
   ```bash
   adb shell pm get-app-links com.fomio.mobile
   ```
   Should show `meta.fomio.app` as verified.

3. **Test a link**:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "https://meta.fomio.app/t/welcome-to-fomio/1"
   ```
   Should open in your app, not the browser.

4. **Check verification status**:
   ```bash
   adb shell pm get-app-links --user cur com.fomio.mobile | grep meta.fomio.app
   ```

## Troubleshooting

### Links still open in browser:

1. **Check verification**: Run `adb shell pm get-app-links com.fomio.mobile` - domain should show as verified
2. **Clear app data**: Uninstall and reinstall the app (Android caches verification)
3. **Wait a few minutes**: Android may take a few minutes to re-verify after server changes
4. **Check fingerprint**: Ensure the SHA256 fingerprint matches exactly
5. **Check package name**: Ensure package name matches `com.fomio.mobile`

### Verification fails:

1. **Check file accessibility**: File must be accessible over HTTPS without redirects
2. **Check JSON format**: Must be a JSON array `[...]`, not object `{...}`
3. **Check fingerprint**: Must match exactly (case-sensitive)
4. **Check package name**: Must match exactly

## Current Configuration

- **Package Name**: `com.fomio.mobile`
- **SHA256 Fingerprint**: `01584EDB4544A6FF9204A6FADD4C860C9D9BCA52D478A4B2D0CA2E2A8993F051`
- **Domain**: `meta.fomio.app`

