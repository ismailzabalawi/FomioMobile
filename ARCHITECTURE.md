# 🏗️ FomioMobile Architecture Documentation

## System Overview

FomioMobile is a React Native mobile application that connects to a Discourse backend, providing a mobile-native social media experience. The app transforms Discourse's forum structure into a modern social media interface.

---

## 📐 Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FomioMobile App                          │
│                  (React Native + Expo)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   UI Layer  │  │ Navigation  │  │   Hooks     │         │
│  │   (Screens) │  │ (Expo Router)│  │ (Business)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                 │
│         └─────────────────┴─────────────────┘                │
│                           │                                   │
│                           ▼                                   │
│         ┌─────────────────────────────────┐                  │
│         │   State Management Layer        │                  │
│         │   - Auth State (useAuth)        │                  │
│         │   - Feed State (useFeed)        │                  │
│         │   - User State (useDiscourseUser)│                 │
│         └─────────────┬───────────────────┘                  │
│                       │                                       │
│                       ▼                                       │
│         ┌─────────────────────────────────┐                  │
│         │    API Service Layer            │                  │
│         │    - discourseApiService        │                  │
│         │    - discourseSsoService        │                  │
│         │    - Security & Validation      │                  │
│         │    - Caching & Retry Logic      │                  │
│         └─────────────┬───────────────────┘                  │
│                       │                                       │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        │ HTTPS + Auth Headers
                        │ Rate Limited Requests
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │   Discourse Backend                   │
        │   (meta.techrebels.info)              │
        │                                       │
        │   - REST API                          │
        │   - SSO/DiscourseConnect              │
        │   - Categories (→ Hubs)               │
        │   - Topics (→ Bytes)                  │
        │   - Posts (→ Comments)                │
        └───────────────────────────────────────┘
```

---

## 🧩 Component Architecture

### Application Structure

```
app/                                    # Expo Router - File-based routing
├── (auth)/                            # Authentication flow
│   ├── _layout.tsx                   # Auth layout wrapper
│   ├── onboarding.tsx                # User onboarding
│   ├── signin.tsx                    # Sign in screen (SSO)
│   └── signup.tsx                    # Sign up screen (SSO)
│
├── (tabs)/                            # Main app tabs
│   ├── _layout.tsx                   # Bottom tab navigator
│   ├── index.tsx                     # Home/Feed screen
│   ├── search.tsx                    # Search screen
│   ├── compose.tsx                   # Create post screen
│   ├── notifications.tsx             # Notifications screen
│   └── settings.tsx                  # Settings screen
│
├── feed/                              # Feed & post details
│   ├── index.tsx                     # Main feed
│   └── [byteId].tsx                  # Individual post view
│
├── (profile)/                         # User profile
│   ├── index.tsx                     # Profile view
│   ├── edit-profile.tsx              # Edit profile
│   └── settings.tsx                  # User settings
│
├── auth/                              # SSO callbacks
│   └── callback.tsx                  # SSO redirect handler
│
├── _layout.tsx                        # Root layout
└── index.tsx                          # App entry point
```

### Shared Components

```
components/
├── ui/                                # Reusable UI components
│   ├── button.tsx                    # Button variants
│   ├── input.tsx                     # Text inputs
│   ├── card.tsx                      # Card containers
│   ├── avatar.tsx                    # User avatars
│   ├── badge.tsx                     # Labels/badges
│   ├── tabs.tsx                      # Tab components
│   ├── switch.tsx                    # Toggle switches
│   ├── textarea.tsx                  # Multi-line input
│   └── index.ts                      # Exports
│
├── shared/                            # Shared functionality
│   ├── theme-provider.tsx            # Theme context
│   ├── theme-toggle.tsx              # Dark mode toggle
│   ├── error-boundary.tsx            # Error handling
│   ├── loading.tsx                   # Loading states
│   └── auth-test.tsx                 # Auth debugging
│
├── feed/                              # Feed-specific components
│   ├── ByteCard.tsx                  # Post card
│   ├── ByteBlogPage.tsx              # Full post view
│   ├── CommentItem.tsx               # Comment display
│   ├── CommentSection.tsx            # Comments list
│   ├── NewCommentInput.tsx           # Comment input
│   └── index.ts                      # Exports
│
└── nav/                               # Navigation components
    ├── HeaderBar.tsx                 # App header
    └── index.ts                      # Exports
```

### Business Logic Layer

```
shared/
├── discourseApi.ts                   # Main API service (1585 lines)
├── discourseApiService.ts            # Service wrapper
├── discourseSsoService.ts            # SSO authentication
├── useAuth.ts                        # Authentication hook
├── useFeed.ts                        # Feed management
├── useComments.ts                    # Comments handling
├── useCreateByte.ts                  # Post creation
├── useNotifications.ts               # Notifications
├── useDiscourseUser.ts               # User management
├── useSearch.ts                      # Search functionality
├── useHubs.ts                        # Categories/Hubs
├── useTerets.ts                      # Subcategories
├── error-handling.tsx                # Error utilities
├── form-validation.tsx               # Form validation
├── logger.ts                         # Logging utility
├── design-system.ts                  # Design tokens
└── index.ts                          # Exports
```

---

## 🔄 Data Flow

### Authentication Flow (SSO)

```
┌──────────────┐
│  User taps   │
│  "Sign In"   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  useAuth.signIn()    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│  DiscourseSsoService.login() │
│  - Generate nonce            │
│  - Build SSO URL             │
│  - Create signature          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Open Web Browser            │
│  (expo-web-browser)          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Discourse Auth Page         │
│  (meta.techrebels.info)      │
└──────┬───────────────────────┘
       │
       │ User authenticates
       ▼
┌──────────────────────────────┐
│  Discourse Callback          │
│  with signed payload         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  App Deep Link               │
│  fomio://auth/callback       │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  DiscourseSsoService.handleCallback()│
│  - Verify signature              │
│  - Parse user data               │
│  - Store session                 │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Update Auth State           │
│  Navigate to Feed            │
└──────────────────────────────┘
```

### Feed Data Flow

```
┌──────────────┐
│  Feed Screen │
│  Mounts      │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  useFeed()          │
│  - Initialize       │
│  - Fetch data       │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  discourseApi.getBytes()         │
│  GET /latest.json                │
└──────┬───────────────────────────┘
       │
       │ Check cache
       ▼
┌──────────────────────────────────┐
│  Cache Check                     │
│  - Fresh? Return cached          │
│  - Stale? Fetch new              │
└──────┬───────────────────────────┘
       │
       │ If needed
       ▼
┌──────────────────────────────────┐
│  HTTP Request                    │
│  - Add auth headers              │
│  - Rate limit check              │
│  - Timeout handling              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Discourse API Response          │
│  { topic_list: { topics: [...] }}│
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Transform Data                  │
│  mapTopicToByte()                │
│  - Map fields                    │
│  - Format dates                  │
│  - Parse content                 │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Update State                    │
│  - Set items                     │
│  - Clear loading                 │
│  - Cache result                  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Render Feed                     │
│  - FlatList                      │
│  - ByteCard components           │
│  - Pull to refresh               │
└──────────────────────────────────┘
```

### Post Creation Flow

```
┌──────────────┐
│  User fills  │
│  post form   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Form Validation    │
│  - Title required   │
│  - Content required │
│  - Length limits    │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  useCreateByte.create()          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Input Sanitization              │
│  - Remove XSS                    │
│  - Escape HTML                   │
│  - Validate format               │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  discourseApi.createByte()       │
│  POST /posts.json                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  HTTP Request                    │
│  - Auth headers                  │
│  - JSON body                     │
│  - Rate limit check              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Discourse Creates Topic         │
│  Returns { topic_id, post_id }  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Fetch Created Topic             │
│  GET /t/:topic_id.json           │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Transform & Cache               │
│  mapTopicToByte()                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Navigate to Post                │
│  /feed/[byteId]                  │
└──────────────────────────────────┘
```

---

## 🗺️ Entity Mapping

### Discourse → Fomio Terminology

```
Discourse Term    →    Fomio Term    │ Description
─────────────────────────────────────┼────────────────────
Category          →    Hub           │ Top-level grouping
Subcategory       →    Teret         │ Sub-grouping
Topic             →    Byte          │ A post/thread
Post              →    Comment       │ Reply to a Byte
User              →    AppUser       │ User account
Notification      →    Notification  │ User alerts
Tag               →    Tag           │ Post tags
Like              →    Like          │ Post likes
Bookmark          →    Bookmark      │ Saved posts
```

### Data Structure Mapping

**Discourse Category → Fomio Hub:**
```typescript
{
  // Discourse
  id: 5,
  name: "Technology",
  slug: "technology",
  description: "Tech discussions",
  color: "3AB54A",
  text_color: "FFFFFF",
  topic_count: 150,
  post_count: 2500
}

// Transformed to Fomio Hub
{
  id: 5,
  name: "Technology",
  slug: "technology",
  description: "Tech discussions",
  color: "#3AB54A",
  textColor: "#FFFFFF",
  topicsCount: 150,
  postsCount: 2500,
  isSubscribed: false,
  discourseId: 5
}
```

**Discourse Topic → Fomio Byte:**
```typescript
{
  // Discourse
  id: 123,
  title: "New React Features",
  excerpt: "Discussing React 19...",
  category_id: 5,
  posts_count: 15,
  views: 250,
  created_at: "2025-01-01T00:00:00Z",
  last_posted_at: "2025-01-02T12:00:00Z",
  pinned: false,
  closed: false,
  liked: true,
  like_count: 42,
  tags: ["react", "javascript"]
}

// Transformed to Fomio Byte
{
  id: 123,
  title: "New React Features",
  excerpt: "Discussing React 19...",
  content: "Full post content...",
  hubId: 5,
  hubName: "Technology",
  author: { /* AppUser */ },
  category: { id: 5, name: "Technology", color: "3AB54A" },
  commentCount: 14, // posts_count - 1
  replyCount: 14,
  lastActivity: "2025-01-02T12:00:00Z",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T12:00:00Z",
  isPinned: false,
  isLocked: false,
  isLiked: true,
  likeCount: 42,
  viewCount: 250,
  tags: ["react", "javascript"],
  discourseId: 123
}
```

---

## 🔒 Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network Security                   │
│  - HTTPS enforcement                         │
│  - Certificate validation                    │
│  - (Optional) Certificate pinning            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 2: Authentication                     │
│  - SSO with signature verification           │
│  - Secure token storage (AsyncStorage)       │
│  - Session management                        │
│  - Auto-refresh tokens                       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 3: Authorization                      │
│  - API key per request (header)              │
│  - User-specific permissions                 │
│  - Role-based access (admin/moderator)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 4: Input Validation                   │
│  - Format validation (email, username, etc.) │
│  - Length limits                             │
│  - Type checking                             │
│  - Required field validation                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 5: Sanitization                       │
│  - XSS protection                            │
│  - SQL injection prevention                  │
│  - HTML escaping                             │
│  - Special character filtering               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 6: Rate Limiting                      │
│  - 60 requests/minute per endpoint           │
│  - 1000 requests/hour global                 │
│  - Exponential backoff on errors             │
│  - Queue management                          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 7: Error Handling                     │
│  - Sanitized error messages                  │
│  - No sensitive data in logs                 │
│  - Secure error reporting                    │
│  - User-friendly messages                    │
└─────────────────────────────────────────────┘
```

### Security Configuration

```typescript
// Security configuration constants
const SECURITY_CONFIG = {
  HTTPS_ONLY: true,              // Enforce HTTPS
  RATE_LIMITING: true,           // Enable rate limiting
  DEBUG_MODE: false,             // Disable in production
  MOCK_DATA: false,              // Never in production
  CERT_PINNING: false,           // Optional advanced security
};

// Input validation patterns
const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  TOKEN: /^[a-zA-Z0-9._-]+$/,
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
};
```

---

## 🚀 Performance Architecture

### Optimization Strategies

1. **Request Caching**
   ```typescript
   private cache: Map<string, { data: any; timestamp: number }>;
   private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
   
   // Cacheable endpoints
   - GET /categories.json
   - GET /site.json
   - GET /session/current.json
   - GET /notifications.json
   ```

2. **Request Deduplication**
   ```typescript
   // Prevent multiple identical requests
   private getCacheKey(endpoint: string, options: RequestInit): string {
     const bodyHash = options.body ? btoa(String(options.body)).slice(0, 8) : '';
     return `${endpoint}_${bodyHash}_${this.authToken ? 'auth' : 'public'}`;
   }
   ```

3. **Retry Logic with Exponential Backoff**
   ```typescript
   async makeRequest<T>(endpoint: string, options: RequestInit = {}, retries: number = 3) {
     try {
       // ... request logic
     } catch (error) {
       if (retries > 0) {
         await this.delay(1000 * (4 - retries)); // Exponential backoff
         return this.makeRequest<T>(endpoint, options, retries - 1);
       }
     }
   }
   ```

4. **Lazy Loading**
   ```typescript
   // Feed pagination
   async loadMore() {
     if (isLoadingMore || !hasMore) return;
     setIsLoadingMore(true);
     const nextPage = currentPage + 1;
     const response = await discourseApi.getBytes(hubId, nextPage);
     // ... update state
   }
   ```

5. **Optimistic Updates**
   ```typescript
   // Like a post
   async likePost(postId: number) {
     // Update UI immediately
     updatePostLikeCount(postId, +1);
     
     try {
       await discourseApi.likePost(postId);
     } catch (error) {
       // Revert on error
       updatePostLikeCount(postId, -1);
       showError('Failed to like post');
     }
   }
   ```

### Performance Monitoring

```typescript
// Request timing
const startTime = Date.now();
const response = await fetch(url);
const responseTime = Date.now() - startTime;
console.log(`Response time: ${responseTime}ms`);

// Cache hit rate
const cacheStats = {
  hits: 0,
  misses: 0,
  hitRate: () => this.hits / (this.hits + this.misses)
};
```

---

## 📱 Platform-Specific Considerations

### iOS
```typescript
// Deep linking
"ios": {
  "bundleIdentifier": "com.fomio.mobile",
  "supportsTablet": true
}

// SSO browser preferences
WebBrowser.openAuthSessionAsync(url, redirect, {
  preferEphemeralSession: false, // Allow cookies
  showInRecents: true
});
```

### Android
```typescript
// Deep linking
"android": {
  "package": "com.fomio.mobile",
  "intentFilters": [/* ... */]
}

// Back button handling
BackHandler.addEventListener('hardwareBackPress', handleBackPress);
```

### Web
```typescript
// Web-specific fallbacks
if (Platform.OS === 'web') {
  // Use btoa/atob for base64
  return btoa(str);
} else {
  // Use Buffer on native
  return Buffer.from(str, 'utf8').toString('base64');
}
```

---

## 🧪 Testing Architecture

### Test Structure

```
__tests__/
├── app/
│   └── auth.integration.test.tsx     # Auth flow tests
├── components/
│   └── button.test.tsx               # Component tests
├── shared/
│   ├── form-validation.test.ts       # Validation tests
│   └── logger.test.ts                # Utility tests
└── scripts/
    ├── test-auth.js                  # Manual API test
    └── discourse-connection-test.js  # Connection test
```

### Testing Tools

```bash
# Unit tests
npm test

# Integration tests
npm run test:auth
npm run test:discourse

# E2E tests (future)
# npm run test:e2e
```

---

## 🔄 State Management

### Authentication State
```typescript
interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Persisted to AsyncStorage
const AUTH_STORAGE_KEY = '@fomio_auth';
```

### Feed State
```typescript
interface FeedState {
  items: Byte[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentPage: number;
}
```

### User Preferences
```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoRefresh: boolean;
}

// Persisted to AsyncStorage
const PREFS_STORAGE_KEY = '@fomio_prefs';
```

---

## 📦 Dependencies

### Core Dependencies
- `expo` - Development platform
- `react-native` - Mobile framework
- `react` - UI library
- `expo-router` - File-based routing

### UI & Styling
- `nativewind` - Tailwind for React Native
- `lucide-react-native` - Icons
- `react-native-safe-area-context` - Safe areas

### Functionality
- `@react-native-async-storage/async-storage` - Storage
- `expo-web-browser` - SSO browser
- `expo-linking` - Deep linking
- `expo-crypto` - Cryptography for SSO

### Development
- `typescript` - Type safety
- `jest` - Testing framework
- `@testing-library/react-native` - Component testing

---

## 🚀 Deployment Architecture

### Development
```bash
npm start          # Start dev server
npm run ios        # Run on iOS
npm run android    # Run on Android
npm run web        # Run on web
```

### Staging
```bash
expo build:ios --release-channel staging
expo build:android --release-channel staging
```

### Production
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```

---

## 📝 Configuration Files

### Key Configuration Files
```
├── app.json              # Expo configuration
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript config
├── babel.config.js       # Babel transpiler
├── nativewind.config.ts  # NativeWind setup
├── tailwind.config.js    # Tailwind CSS
├── .env                  # Environment variables
├── .gitignore            # Git ignore rules
└── expo-env.d.ts         # Expo type definitions
```

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Offline mode with local storage
- [ ] Push notifications
- [ ] Real-time updates (WebSocket)
- [ ] Media upload & compression
- [ ] Advanced search filters
- [ ] User mentions & tagging
- [ ] Direct messaging
- [ ] Rich text editor
- [ ] Markdown support
- [ ] Code syntax highlighting

### Performance Improvements
- [ ] Image optimization & lazy loading
- [ ] Virtual scrolling for large lists
- [ ] Request batching
- [ ] Service worker for web
- [ ] Database caching (SQLite)

### Developer Experience
- [ ] Storybook for components
- [ ] E2E testing with Detox
- [ ] CI/CD pipeline
- [ ] Automated releases
- [ ] Performance monitoring

---

## 📚 Related Documentation

- **QUICK_START.md** - Quick setup guide
- **DISCOURSE_CONNECTION_AUDIT.md** - Technical audit
- **DISCOURSE_SSO_IMPLEMENTATION.md** - SSO setup
- **AUDIT_SUMMARY.md** - Executive summary
- **env.example** - Environment template

---

This architecture document provides a comprehensive overview of FomioMobile's structure, data flow, and design decisions. Refer to specific documentation for implementation details.

