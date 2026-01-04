# Fomio Deep Linking Contract

> Single source of truth for all deep linking behavior in Fomio.

## URL Scheme

- **Internal Scheme**: `fomio://`
- **External URLs**: `https://meta.fomio.app/...` (Phase 2: Universal Links)

---

## Supported Deep Links

| Deep Link | Route | Auth Required | Discourse Concept |
|-----------|-------|---------------|-------------------|
| `fomio://` | `/(tabs)` | No | - |
| `fomio://home` | `/(tabs)` | No | - |
| `fomio://byte/{id}` | `/feed/{id}` | No | Topic |
| `fomio://byte/{id}/comments` | `/feed/{id}?showComments=true` | No | Topic |
| `fomio://teret/{slug}` | `/teret/{slug}` | No | Category |
| `fomio://teret/id/{id}` | `/teret/{id}?byId=true` | No | Category (by ID) |
| `fomio://hub/{slug}` | `/hub/{slug}` | No | Parent Category |
| `fomio://hub/id/{id}` | `/hub/{id}?byId=true` | No | Parent Category (by ID) |
| `fomio://profile/{username}` | `/profile/{username}` | No | User |
| `fomio://me` | `/(tabs)/profile` | **Yes** | Current User |
| `fomio://search` | `/(tabs)/search` | No | - |
| `fomio://search?q={query}` | `/(tabs)/search?q={query}` | No | - |
| `fomio://notifications` | `/(tabs)/notifications` | **Yes** | - |
| `fomio://compose` | `/compose` | **Yes** | - |
| `fomio://compose?teret={slug}` | `/compose?teret={slug}` | **Yes** | - |
| `fomio://settings` | `/(profile)/settings` | **Yes** | - |
| `fomio://settings/profile` | `/(profile)/edit-profile` | **Yes** | - |
| `fomio://settings/notifications` | `/(profile)/notification-settings` | **Yes** | - |

---

## Legacy Aliases (Internal Only)

These are hidden from public documentation but support old links for migration tolerance.

| Alias | Resolves To |
|-------|-------------|
| `fomio://topic/{id}` | `fomio://byte/{id}` |
| `fomio://t/{id}` | `fomio://byte/{id}` |
| `fomio://u/{username}` | `fomio://profile/{username}` |

---

## Auth Carve-Outs

These paths bypass normal routing and go directly to the auth handler:

- `fomio://auth/callback?payload=...`
- `fomio://auth_redirect?payload=...`

---

## Navigation Behavior

| Scenario | Navigation Method | Back Stack |
|----------|-------------------|------------|
| Cold start (app killed) | `router.replace()` | Clean - no back to launcher |
| Warm start (app backgrounded) | `router.push()` | Preserved - back returns to previous screen |
| Unknown path | Fallback to `/(tabs)` | Log warning for debugging |
| Auth required + not logged in | Show auth → intent replay | User lands at intended destination after login |

---

## URL Parsing (Production Hardened)

### Host/Path Normalization

`expo-linking` parses URLs inconsistently:

| URL | `hostname` | `path` |
|-----|------------|--------|
| `fomio://byte/123` | `byte` | `123` |
| `fomio:///byte/123` | `` | `byte/123` |

**Solution**: Always join `hostname + path` into single effective path before pattern matching.

### Query Parameter Handling

`queryParams` may contain various types:

| Type | Handling |
|------|----------|
| `string` | Use as-is |
| `number` | Convert to string |
| `boolean` | Convert to string (`"true"` / `"false"`) |
| `array` | Take first element |
| `undefined`/`null` | Skip |

---

## Implementation Files

| File | Purpose |
|------|---------|
| `lib/deep-linking.ts` | Route patterns and configuration |
| `lib/deep-link-handler.ts` | URL parsing, resolution, and navigation |
| `lib/url-builder.ts` | Generate shareable deep link URLs |
| `app/_layout.tsx` | Listener setup for cold/warm start |

---

## Testing

### Unit Tests

See `__tests__/lib/deep-linking.test.ts` for:

- Host/path normalization edge cases
- Query parameter handling
- Legacy alias resolution
- Auth carve-out detection
- Fallback behavior

### Manual Testing (Dev Build)

Use the dev tester screen at `/(debug)/deep-links` or run:

```bash
# iOS Simulator
xcrun simctl openurl booted "fomio://byte/123"
xcrun simctl openurl booted "fomio:///byte/123"  # Triple-slash edge case
xcrun simctl openurl booted "fomio://search?q=react%20native"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "fomio://byte/123"
```

### Cold Start vs Warm Start

1. **Cold start**: Kill app completely, then open deep link
2. **Warm start**: Background app (home button), then open deep link
3. Verify back button behavior differs correctly

---

## Sharing

### In-App Sharing

Use `lib/url-builder.ts` functions:

```typescript
import { buildByteUrl, toWebUrl } from '@/lib/url-builder';

// For in-app use (other Fomio users)
const appUrl = buildByteUrl(123);  // "fomio://byte/123"

// For external sharing (WhatsApp, Twitter, Email)
const webUrl = toWebUrl(appUrl);   // "https://meta.fomio.app/t/-/123"
```

### External Share Strategy

| Platform | URL Type | Behavior |
|----------|----------|----------|
| In-app | `fomio://...` | Direct navigation |
| External (app installed) | `https://...` | Opens app via Universal Link (Phase 2) |
| External (no app) | `https://...` | Opens web fallback |

---

## Future: Universal Links (Phase 2)

When implemented, these web URLs will open the app:

| Web URL | Maps To |
|---------|---------|
| `https://meta.fomio.app/t/{slug}/{id}` | `fomio://byte/{id}` |
| `https://meta.fomio.app/u/{username}` | `fomio://profile/{username}` |
| `https://meta.fomio.app/c/{slug}` | `fomio://teret/{slug}` |

Requires:
- iOS: Associated Domains + AASA file
- Android: Intent filters + assetlinks.json

---

## Intent Replay (Phase 1.2)

When a user taps a deep link to an auth-required route while logged out:

1. **Intent is stored** in AsyncStorage with a 15-minute TTL
2. **User is redirected** to sign-in screen
3. **After successful auth**, the original intent is replayed automatically
4. **User lands on** their intended destination, not the home screen

### Implementation Files

| File | Purpose |
|------|---------|
| `lib/pending-intent.ts` | Intent storage with TTL and in-memory cache |
| `shared/hooks/useIntentReplay.ts` | Listens for auth success, triggers replay |
| `app/_layout.tsx` | Passes auth state to handler, runs replay hook |
| `app/auth/callback.tsx` | Alternative replay path for fallback auth flow |

### Guardrails

- **Auth callbacks are never stored** as pending intents (prevents loops)
- **TTL of 15 minutes** prevents stale intents from replaying unexpectedly
- **Clear before replay** ensures single-use behavior
- **Uses `router.replace()`** so back button doesn't return to auth

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-03 | Phase 1 complete: Custom URL scheme with all routes |
| 2026-01-03 | Phase 1.1: Contract doc, tests, dev tester |
| 2026-01-03 | Phase 1.2: Intent replay for auth-required deep links |

