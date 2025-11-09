# Changelog

All notable changes to FomioMobile will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.00.253] - 2025-01-XX

### Added
- `react-native-quick-crypto` package for proper RSA key generation and decryption in React Native
- Support for Web Crypto API polyfills in React Native environments
- Improved crypto API detection (checks both QuickCrypto and Web Crypto API)

### Changed
- Updated `shared/userApiKeyManager.ts` to use `react-native-quick-crypto` for RSA operations in React Native
- Enhanced RSA key generation to try QuickCrypto first, then Web Crypto API, then fallback
- Enhanced RSA decryption to try QuickCrypto first, then Web Crypto API
- Improved error messages for crypto API failures

### Fixed
- **CRITICAL**: Fixed SecureStore key validation errors by removing invalid `@` prefix from storage keys
  - Changed `@fomio_user_api_private_key` → `fomio_user_api_private_key`
  - Changed `@fomio_user_api_key` → `fomio_user_api_key`
  - Changed `@fomio_user_api_client_id` → `fomio_user_api_client_id`
  - Changed `@fomio_user_api_otp` → `fomio_user_api_otp`
- Fixed TypeScript compilation errors:
  - Fixed return type in `app/(tabs)/notifications.tsx` to allow `null`
  - Fixed route reference in `app/auth-callback.tsx` from removed `webview-auth` to `authorize`
  - Fixed `useEffect` cleanup function return types in `shared/useFeed.ts`, `shared/useHubs.ts`, and `shared/useDiscourseUser.ts`
  - Fixed dependency order issues in `shared/useFeed.ts` and `shared/useHubs.ts`
  - Fixed `scopes` type issue in `shared/userApiKeyAuth.ts`
- Fixed `attachIntentReplay` return type to properly return cleanup function
- Fixed `useColorScheme` hook to properly use React Native's `useColorScheme` with correct types
- Removed unnecessary warnings about simplified RSA key generation (now uses proper crypto libraries)

### Security
- Proper RSA key generation and decryption using native crypto libraries
- SecureStore keys now comply with Expo SecureStore key format requirements

## [0.00.252] - 2025-01-XX

### Added
- Comprehensive JSDoc documentation for User API Key authentication system
- Runtime validation and error handling improvements
- API key status display in auth test component

### Changed
- Enhanced `components/shared/auth-test.tsx` to display real-time API key status
- Improved error messages throughout authentication flow
- Updated all user-facing text to consistently use "Authorize" terminology
- Added comprehensive inline documentation explaining User API Key authentication behavior
- Verified and validated all navigation flows work correctly with User API Keys
- Confirmed all custom hooks (useFeed, useCreateByte, useComments, etc.) work with API key authentication

### Fixed
- Removed all remaining references to cookie/session-based authentication
- Standardized error messages to be generic and appropriate for API key authentication
- Ensured consistent terminology across all authentication-related UI components

### Documentation
- Added JSDoc comments explaining User API Key authentication flow
- Documented authentication architecture in code comments
- Updated error messages to provide clear guidance for users

## [0.00.251] - 2025-01-XX

### Removed
- **BREAKING**: Removed WebView/cookie-based authentication system
- Deleted `shared/cookieManager.ts` - No longer needed
- Deleted `shared/sessionManager.ts` - No longer needed
- Deleted `shared/webviewAuth.ts` - Replaced by User API Keys
- Deleted `components/auth/AuthWebView.tsx` - Replaced by authorize screen
- Deleted `components/auth/index.ts` - No longer needed
- Deleted `app/(auth)/webview-auth.tsx` - Replaced by authorize screen
- Removed `EXPO_PUBLIC_USE_USER_API_KEYS` feature flag (always uses API keys now)

### Changed
- **BREAKING**: Authentication now exclusively uses User API Keys (no cookie fallback)
- Created `app/(auth)/authorize.tsx` to replace webview-auth screen
- Simplified `shared/useAuth.ts` - Removed all cookie/session logic, only API keys
- Simplified `shared/discourseApi.ts` - Removed cookie fallback, always uses User-Api-Key header
- Updated all authentication screens to use "Authorize" instead of "Sign In"
- Updated error messages to reflect API key authentication
- Updated user-facing text throughout the app
- Updated `components/shared/auth-test.tsx` to show API key status
- Updated navigation flows to use authorize screen

### Security
- Simplified authentication architecture with single method (User API Keys)
- Removed ~500+ lines of cookie/session management code
- Better security with per-user scoped API keys vs shared session cookies

## [0.00.250] - 2025-01-XX

### Added
- Discourse User API Keys authentication system following official specification
- Per-user RSA key pair generation for secure API key authentication
- `shared/userApiKeyManager.ts` for RSA key generation, storage, and payload decryption
- `shared/userApiKeyAuth.ts` for authorization flow orchestration and endpoint handling
- `app/auth-callback.tsx` screen for handling deep link redirects with encrypted payload
- Feature flag `EXPO_PUBLIC_USE_USER_API_KEYS` for gradual migration from cookies to API keys
- Dual-mode authentication support (API keys when enabled, cookies as fallback)
- API key revocation functionality via `/user-api-key/revoke` endpoint
- Deep linking configuration for authorization callbacks (`fomio://auth-callback`)
- Comprehensive error handling for authorization rejection, expired keys, and decryption failures
- Support for one-time password generation via User API Keys
- Client ID generation and management for API key tracking

### Changed
- Updated `shared/discourseApi.ts` to use `User-Api-Key` header when feature flag is enabled
- Modified `shared/useAuth.ts` to check for User API Keys instead of session cookies when enabled
- Updated `components/auth/AuthWebView.tsx` to handle `/user-api-key/new` authorization flow
- Enhanced `shared/webviewAuth.ts` with `initiateApiKeyAuthorization()` method
- Modified `app/(auth)/webview-auth.tsx` to show API key authorization screen when enabled
- Authentication now supports both cookie-based (legacy) and API key-based (new) methods
- API requests automatically use appropriate authentication method based on feature flag

### Security
- Per-user API keys with RSA encryption for secure payload transmission
- Private keys stored securely in Expo SecureStore
- API keys can be revoked by users at any time
- Scoped permissions via Discourse authorization flow
- Enhanced security through key-based authentication vs cookie-based

## [0.00.240] - 2025-01-XX

### Added
- ESLint v9 configuration with TypeScript, React, and React Native rules
- Comprehensive error handling for AsyncStorage operations
- Graceful degradation for storage directory issues
- Error handling for font loading failures
- Improved error messages and logging throughout the application

### Changed
- Consolidated API services: Removed duplicate `DiscourseApiService` wrapper
- All imports now use `discourseApi` directly from `shared/discourseApi.ts`
- Updated `shared/index.ts` to export all necessary types (AppUser, Hub, Byte, Comment, SearchResult)
- Improved AsyncStorage error handling to prevent app crashes
- Enhanced font loading to not block app rendering on failure
- Updated WebView installation to use Expo-compatible version (13.8.6)
- Improved bookmark/unbookmark methods with proper error handling
- Enhanced all storage operations with graceful error handling

### Fixed
- Resolved all TypeScript compilation errors
- Fixed duplicate API service classes causing confusion
- Fixed type safety issues (removed all `any` types from API service)
- Fixed AsyncStorage directory errors (code 512) with graceful handling
- Fixed font loading errors that blocked app rendering
- Fixed WebView module resolution errors
- Fixed incomplete implementations (updateComment, deleteComment, bookmarks)
- Fixed inconsistent exports across the codebase
- Fixed storage operations to work even when AsyncStorage has issues
- Fixed all imports to use consolidated API service

### Removed
- Removed duplicate `shared/discourseApiService.ts` wrapper file
- Removed duplicate type definitions (`ApiResponse` duplicates)
- Removed unnecessary API service wrapper class

### Security
- Enhanced error handling to prevent information leakage
- Improved storage error handling to maintain app security

## [0.00.230] - 2025-01-XX

### Added
- Webview-based authentication following DiscourseMobile pattern
- `shared/webviewAuth.ts` service for webview authentication flow with cookie extraction
- `shared/cookieManager.ts` for secure cookie storage and retrieval using AsyncStorage
- `shared/sessionManager.ts` for session validation, refresh, and expiration handling
- `components/auth/AuthWebView.tsx` reusable WebView component for authentication
- `app/(auth)/webview-auth.tsx` screen for webview authentication with URL monitoring
- Session cookie extraction from webview after successful authentication
- Automatic session validation and refresh
- Session persistence across app restarts
- Comprehensive error handling for webview failures, cookie extraction, and session expiration

### Changed
- Migrated from API key authentication to webview-based session cookie authentication
- Updated `shared/discourseApi.ts` to use session cookies instead of API key headers
- Updated `shared/useAuth.ts` to use webview authentication and session cookies
- Updated `app/(auth)/signin.tsx` to use webview authentication instead of username/password form
- All API calls now use session cookies for authentication
- Enhanced error handling for 401/403 errors (expired/invalid session)
- Improved authentication flow to match DiscourseMobile pattern

### Removed
- API key authentication dependencies (no longer required)
- Username/password input fields from signin screen
- API key fallback in API requests (cookies are now required)

### Security
- Session cookies are stored securely in AsyncStorage
- Automatic cookie expiration validation
- Session invalidation on 401/403 errors
- Secure cookie extraction from webview

## [0.00.220] - 2025-01-XX

### Fixed
- Fixed navigation test implementation for ByteBlogPage
- Resolved various TypeScript compilation errors
- Fixed component test IDs and accessibility props

### Changed
- Updated test environment with proper React Native component mocks
- Improved test structure and component testing patterns

## [0.00.210] - 2025-01-XX

### Added
- Complete search screen integration with Discourse API
- Real-time search functionality for topics, categories, and users
- `useCategories` hook for fetching real categories from Discourse
- `useTrendingTopics` hook for engagement-based topic discovery
- `useRecentTopics` hook for latest content discovery
- Search results screen with dedicated navigation
- Pull-to-refresh functionality for all search sections
- Category navigation and topic navigation from search results

### Changed
- Enhanced search hook with real Discourse search API integration
- Updated search screen to display real data from TechRebels forum
- Improved search UX with loading states and error handling

### Fixed
- Search query validation and error recovery
- Network error handling in search functionality

## [0.00.200] - 2025-01-XX

### Added
- Comprehensive security implementation guide
- Input validation and sanitization for all user inputs
- HTTPS enforcement for production environments
- Rate limiting (60 requests/minute) to prevent API abuse
- Secure token management with AsyncStorage validation
- XSS protection through input sanitization
- Password security requirements and validation
- Email format validation
- File upload security (avatar upload validation)
- Security configuration options (HTTPS_ONLY, RATE_LIMITING, DEBUG_MODE)
- Security audit checklist and monitoring tools

### Changed
- Enhanced error handling with secure error messages
- Improved token storage with validation
- Updated API service with comprehensive security measures

### Security
- Implemented input sanitization to prevent XSS attacks
- Added rate limiting to prevent DoS attacks
- Enforced HTTPS in production environments
- Secure token storage and validation
- Production error message sanitization

## [0.00.190] - 2025-01-XX

### Added
- Complete replacement of mock data with real Discourse integration
- Real feed loading via `useFeed` hook with Discourse topics
- Real notifications via `useNotifications` hook
- Real user profiles via `useDiscourseUser` hook
- Real post creation via `useCreateByte` hook
- Real search functionality via `useSearch` hook

### Changed
- Main feed screen now loads real Discourse topics
- Notifications screen displays real Discourse notifications
- Settings screen uses real Discourse authentication
- Profile screen shows real user data from Discourse
- All screens migrated from mock data to real API integration

### Removed
- All mock data and hardcoded content
- Mock authentication flows
- Placeholder data structures

## [0.00.180] - 2025-01-XX

### Fixed
- Resolved Reanimated initialization error: "Native part of Reanimated doesn't seem to be initialized"
- Updated `react-native-reanimated` from `~3.10.1` to `~3.16.7` for compatibility
- Fixed import order by moving Reanimated import to top of `app/_layout.tsx`
- Resolved version mismatch between JavaScript and native parts of Reanimated
- Fixed compatibility with `@gorhom/bottom-sheet` dependency

### Changed
- Updated React to version 18.3.1 for compatibility
- Verified Babel configuration for Reanimated plugin

## [0.00.170] - 2025-01-XX

### Added
- Native React Native UI components to replace Gluestack UI
- Button component with variants (default, destructive, outline, secondary, ghost, link) and sizes
- Input component with variants (outline, underlined, rounded) and keyboard types
- Card component with sub-components (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- Avatar component with multiple sizes (xs, sm, md, lg, xl, 2xl)
- Badge component with variants (solid, outline) and actions (error, warning, success, info, muted)
- Switch component with custom sizes and colors
- Textarea component with variants and multiline support
- Tabs component with context-based state management

### Changed
- Removed Gluestack UI dependency (`@gluestack-ui/themed`)
- Removed `class-variance-authority` utility dependency
- Updated theme system to work without Gluestack UI
- Migrated all screens to use native React Native components
- Maintained exact same functionality and design from original Next.js project

### Fixed
- Resolved all TypeScript compilation errors from Gluestack removal
- Fixed style array typing issues with explicit switch statements
- Fixed StyleProp usage for proper type safety
- Fixed autoComplete type definitions for TextInput
- Fixed conditional rendering in Badge component

### Removed
- Gluestack UI theme configuration file
- GluestackUIProvider dependency

## [0.00.160] - 2025-01-XX

### Added
- Comprehensive testing infrastructure with Jest and React Native Testing Library
- Unit tests for core utilities (logger, error handling, validation)
- Integration tests for authentication flow
- Component tests with accessibility and interaction testing
- Test scripts: `test`, `test:watch`, `test:coverage`, `test:ci`
- Security audit system with automated vulnerability scanning
- Production build validation script
- Cross-platform testing (iOS, Android, Web)
- Performance testing and benchmarking tools
- Bundle size analysis and optimization recommendations

### Changed
- Updated test configuration for React Native environment
- Enhanced mock setup for React Native components
- Improved test coverage reporting

### Fixed
- Test environment setup issues
- Component test IDs and accessibility props
- Mock dependencies for async operations

## [0.00.150] - 2025-01-XX

### Added
- Comprehensive error handling system with multi-level error boundaries
- Global error boundary for app-level crash recovery
- Screen-level error boundaries for isolated failures
- Component-level error handling with ErrorManager
- Standardized error objects with severity and recovery suggestions
- Network status detection and monitoring
- Offline data caching with TTL and automatic cleanup
- Queue-based action retry mechanisms with priority processing
- Background synchronization when connection restored
- Enhanced form validation with real-time debounced validation
- Comprehensive validation rules library (10+ pre-built rules)
- Toast notification system with animations and actions
- Form state persistence across sessions
- Network resilience hooks: `useNetworkStatus`, `useOfflineData`, `useQueuedAction`
- Error handling hooks: `useErrorHandler`, `useErrorBoundary`

### Changed
- Improved error recovery with automatic retry mechanisms
- Enhanced user feedback with toast notifications
- Standardized form validation patterns across all forms
- Improved offline functionality with intelligent caching

### Fixed
- Error message sanitization for production
- Network error handling and recovery
- Form validation edge cases

## [0.00.140] - 2025-01-XX

### Added
- Bundle analysis and optimization tools
- Bundle analyzer script for dependency and source code analysis
- Code splitting implementation with lazy loading utilities
- Screen-level lazy loading with `createLazyScreen` utility
- Component-level dynamic imports with `createLazyComponent`
- Image lazy loading with `LazyImage` component using intersection observer
- Progressive loading strategies with priority-based content loading
- Memory optimizer with comprehensive leak detection
- Performance monitoring system with real-time tracking
- Component cleanup tracking for timers and listeners
- Memory snapshot system for historical analysis
- Performance metrics collection (render time, memory usage, network performance)
- `useMemoryOptimization` hook for automatic memory management
- Performance tracking HOC: `withPerformanceTracking`

### Changed
- Optimized bundle size with tree shaking and code splitting
- Improved memory management with automatic cleanup
- Enhanced performance monitoring with real-time alerts

### Fixed
- Memory leak detection and prevention
- Component cleanup in useEffect hooks
- Animation performance with native driver usage

## [0.00.130] - 2025-01-XX

### Added
- Comprehensive design system with typography scale (7 text styles)
- Professional color palette with semantic tokens
- Consistent 8-point grid spacing system
- Component token specifications
- Animation system with smooth timing and easing functions
- Enhanced ByteCard component with React.memo optimization
- Button component with multiple variants, loading states, icons, and animations
- Loading components with shimmer animations and skeleton screens
- Feed screen with pull-to-refresh and optimized rendering
- Micro-interactions: button press animations, like animations, pull-to-refresh
- Header animations with dynamic opacity based on scroll position

### Changed
- Improved visual consistency across all screens
- Enhanced component performance with React.memo
- Optimized FlatList rendering with proper item layout
- Improved accessibility with WCAG 2.1 AA compliance

### Fixed
- Touch target sizing (44px minimum)
- Color contrast for accessibility
- Screen reader support and semantic markup

## [0.00.120] - 2025-01-XX

### Added
- Dark theme integration for all UI components
- Theme-aware Button component with dynamic color variants
- Theme-aware Input component with disabled state support
- Theme-aware Card component with dark/light backgrounds
- Theme-aware Avatar and Badge components
- Dynamic tab bar colors based on current theme
- Production-ready logger system (`shared/logger.ts`) with levels, context, and production safety
- Error boundaries (`components/shared/error-boundary.tsx`) with retry functionality
- Loading components (`components/shared/loading.tsx`) with standardized states, overlays, and skeletons
- React.memo optimization for expensive components

### Changed
- Replaced all console.log statements with structured logging
- Enhanced error handling throughout the application
- Improved component architecture with consistent patterns
- Updated TypeScript interfaces for better type safety

### Fixed
- Zero TypeScript compilation errors
- Dark theme support across all components
- Tab bar theme integration
- Production code quality issues

## [0.00.110] - 2025-01-XX

### Added
- Complete Discourse API integration with secure authentication
- `useAuth` hook for Discourse authentication with secure token storage
- `useFeed` hook for loading real Discourse topics with pagination
- `useCreateByte` hook for creating topics and replies with validation
- `useNotifications` hook for real-time Discourse notifications
- `useDiscourseUser` hook for profile management and settings sync
- `useSearch` hook for searching topics, categories, and users
- `useCategories` hook for category management
- `useTerets` hook for Teret (topic) management
- `useHubs` hook for Hub (category) management
- `useComments` hook for comment management
- `useTopic` hook for individual topic details
- `useTrendingTopics` hook for trending content
- `useRecentTopics` hook for recent content
- `usePostActions` hook for post interactions (like, bookmark, etc.)
- Discourse API service with comprehensive CRUD operations
- HTTPS enforcement for production security
- Rate limiting (60 requests/minute) to prevent API abuse
- Input validation and sanitization for XSS protection
- Secure token management with AsyncStorage
- Command-line testing tools (`scripts/test-auth.js`)
- Setup script for environment configuration (`scripts/setup-env.js`)
- Discourse connection test script (`scripts/discourse-connection-test.js`)

### Changed
- Migrated from mock data to real Discourse API integration
- Updated authentication flow to use Discourse API
- Enhanced API service with caching and retry logic

### Security
- Implemented HTTPS enforcement
- Added rate limiting protection
- Input sanitization for XSS prevention
- Secure error message handling

## [0.00.100] - 2025-01-XX

### Added
- Initial project setup and migration from Next.js to React Native
- Expo Router file-based navigation structure
- Authentication flow screens (onboarding, signin, signup)
- Main app flow screens (feed, compose, profile, notifications, settings)
- Feed and byte details screens
- Profile management screens
- Navigation structure with tab bar and stack navigation
- Theme system with dark/light mode support
- TypeScript configuration with strict mode
- NativeWind for Tailwind CSS styling
- Project structure with components, shared hooks, and utilities
- Basic UI components library
- Safe area handling for iOS and Android

### Changed
- Migrated from Next.js web application to React Native mobile app
- Converted web components to React Native components
- Updated routing from Next.js routing to Expo Router

---

[Unreleased]: https://github.com/yourusername/FomioMobile/compare/v0.00.240...HEAD

