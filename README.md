# FomioMobile

A mobile-first, privacy-conscious alternative to Reddit built with React Native and Expo. FomioMobile connects to a Discourse backend to provide a native mobile experience for social forums.

## Features

- **Cross-platform**: Runs on iOS, Android, and Web
- **Discourse Integration**: Full integration with Discourse forum backend
- **Modern UI**: Built with native React Native components
- **Dark/Light Mode**: Automatic theme switching with manual override
- **Type-safe**: Full TypeScript support with strict mode
- **File-based Routing**: Using Expo Router for intuitive navigation
- **Real-time Data**: Live synchronization with Discourse backend
- **Offline Support**: Caching and offline functionality
- **Security**: HTTPS enforcement, rate limiting, and input validation
- **Error Resilience**: Graceful error handling for storage, network, and UI failures
- **Code Quality**: ESLint configuration, zero TypeScript errors, comprehensive error handling

## Tech Stack

### Core Framework
- **React Native** 0.81.5 - Mobile app framework
- **Expo** 54.0.23 - Development platform and tooling
- **Expo Router** ~6.0.14 - File-based navigation
- **React** 19.2.0 - UI library
- **TypeScript** ~5.9.2 - Type safety

### UI & Styling
- **NativeWind** ^4.1.23 - Tailwind CSS for React Native
- **Phosphor Icons** ^3.0.0 - Icon system
- **Lucide React Native** ^0.553.0 - Additional icons
- **React Native Reanimated** ~4.1.1 - Animations
- **React Native Gesture Handler** ^2.29.1 - Gesture handling

### State Management
- **Zustand** ^5.0.6 - Lightweight state management
- **AsyncStorage** 1.23.1 - Local data persistence
- **Custom Hooks** - Shared business logic

### Backend Integration
- **Discourse API** - Full REST API integration with consolidated service
- **User API Keys** - Per-user RSA key-based authentication with encrypted payload handling
- **Rate Limiting** - API abuse prevention (60 requests/minute)
- **Input Validation** - XSS protection and sanitization
- **Error Handling** - Comprehensive error handling with graceful degradation

### Development Tools
- **ESLint** - Code quality and consistency
- **TypeScript** - Strict type checking
- **Jest** - Testing framework
- **React Native Testing Library** - Component testing

## Prerequisites

- **Node.js** 18.x, 20.x, or 22.x LTS (recommended: 20.x)
  - Use `nvm` to manage versions: `nvm use` (project includes `.nvmrc`)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FomioMobile
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```bash
# Discourse API Configuration
EXPO_PUBLIC_DISCOURSE_URL=https://your-discourse-instance.com

# Security Settings
EXPO_PUBLIC_ENABLE_HTTPS_ONLY=true
EXPO_PUBLIC_ENABLE_RATE_LIMITING=true
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
EXPO_PUBLIC_ENABLE_MOCK_DATA=false

# Deep Linking (for authorization callbacks)
EXPO_PUBLIC_AUTH_REDIRECT_SCHEME=fomio://auth/callback
```

**Note:** 
- **User API Keys**: The app uses Discourse User API Keys for authentication. Users authorize the app through Discourse's authorization flow.
- Requires Discourse site settings to allow User API Keys.
- The app gracefully handles storage errors and continues functioning even if AsyncStorage has issues.

4. Start the development server:
```bash
npm start
```

5. Run on your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser

## Project Structure

```
FomioMobile/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx
│   │   ├── signin.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Feed screen
│   │   ├── search.tsx            # Search screen
│   │   ├── compose.tsx           # Create post screen
│   │   ├── notifications.tsx     # Notifications screen
│   │   └── settings.tsx          # Settings screen
│   ├── feed/                     # Feed & post details
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [byteId].tsx          # Individual post view
│   ├── (profile)/                # User profile
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── edit-profile.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # App entry point
├── components/                   # Reusable components
│   ├── ui/                      # UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── switch.tsx
│   │   ├── textarea.tsx
│   │   └── index.ts
│   ├── feed/                    # Feed-specific components
│   └── shared/                  # Shared utilities
│       ├── error-boundary.tsx
│       ├── loading.tsx
│       └── theme-provider.tsx
├── shared/                      # Business logic hooks
│   ├── useAuth.ts              # Authentication
│   ├── useFeed.ts              # Feed management
│   ├── useCreateByte.ts       # Post creation
│   ├── useDiscourseUser.ts    # User management
│   ├── useNotifications.ts    # Notifications
│   ├── useSearch.ts           # Search functionality
│   ├── discourseApi.ts        # Main API service (single source of truth)
│   ├── userApiKeyManager.ts   # User API key generation and management
│   ├── userApiKeyAuth.ts      # User API key authorization flow
│   └── logger.ts              # Logging utility
├── scripts/                    # Utility scripts
│   ├── test-auth.js           # Authentication testing
│   ├── discourse-connection-test.js
│   └── setup-env.js
├── assets/                     # Static assets
├── global.css                  # Global styles
├── tailwind.config.js         # Tailwind configuration
├── nativewind.config.ts       # NativeWind configuration
└── package.json
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Start iOS simulator
- `npm run android` - Start Android emulator
- `npm run web` - Start web version
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode
- `npm run test:discourse` - Test Discourse connection
- `npm run test:auth` - Test authentication
- `npm run setup:env` - Interactive environment setup

## Discourse Integration

FomioMobile uses a custom mapping system to transform Discourse's forum structure into a social media interface:

- **Categories** → **Hubs** - Main content categories
- **Topics** → **Bytes** - Individual posts
- **Posts** → **Comments** - Replies to posts

### Authentication

FomioMobile uses **User API Keys** for authentication:

- Users authorize the app through Discourse's User API Key authorization flow
- Each user generates their own API key with scoped permissions
- RSA key pairs are generated client-side for secure payload decryption
- API keys are stored securely and used in request headers
- Keys can be revoked by users at any time
- Requires Discourse site settings to allow User API Keys

The app includes comprehensive hooks for:
- Authentication (`useAuth`) - User API Key-based authentication with API key management
- Feed loading (`useFeed`)
- Post creation (`useCreateByte`)
- User management (`useDiscourseUser`)
- Notifications (`useNotifications`)
- Search (`useSearch`)
- Categories (`useCategories`)

## Security Features

- **HTTPS Enforcement**: All API calls use HTTPS in production
- **Rate Limiting**: 60 requests per minute to prevent API abuse
- **Input Validation**: Comprehensive validation and sanitization
- **XSS Protection**: Input sanitization to prevent XSS attacks
- **User API Keys**: Per-user RSA key-based authentication with encrypted payload handling
- **Error Handling**: Secure error messages without exposing sensitive data
- **API Key Expiration Handling**: Automatic API key validation and re-authorization prompts
- **API Key Revocation**: Users can revoke their API keys at any time
- **Deep Linking**: Secure deep link handling for authorization callbacks
- **Graceful Degradation**: App continues functioning even when storage or network has issues
- **Type Safety**: Full TypeScript strict mode for compile-time error prevention

## Troubleshooting

### Authentication Issues

**"Authorization expired. Please authorize the app again."**
- Your API key may have expired or been revoked
- Navigate to the authorize screen to generate a new API key
- Ensure your Discourse instance has User API Keys enabled in site settings

**"Failed to decrypt payload"**
- This usually indicates an issue with the RSA key pair
- Try clearing app data and re-authorizing
- Ensure your device has sufficient storage for secure key storage

**Deep link not working**
- Verify `EXPO_PUBLIC_AUTH_REDIRECT_SCHEME` is set correctly in your `.env` file
- Ensure your `app.json` has the correct deep linking configuration
- On iOS, test with a physical device as simulators may have deep link limitations

**"User API Keys not enabled"**
- Contact your Discourse administrator to enable User API Keys
- This feature must be enabled in Discourse site settings: Settings → API → Enable User API Keys

### General Issues

**Storage errors**
- The app gracefully handles AsyncStorage errors and continues functioning
- If you encounter persistent storage issues, try clearing app data
- Ensure your device has sufficient storage space

**Network errors**
- Check your internet connection
- Verify `EXPO_PUBLIC_DISCOURSE_URL` is correct and accessible
- Ensure HTTPS is properly configured if using HTTPS-only mode

## Development

### Code Style

- TypeScript for all code with strict mode enabled
- Functional components with hooks
- Consistent naming conventions (camelCase for variables, PascalCase for components)
- Feature-based organization
- ESLint for code quality and consistency
- Zero TypeScript compilation errors
- Comprehensive error handling with graceful degradation

### Code Quality

- **Type Safety**: Full TypeScript strict mode, no `any` types
- **Linting**: ESLint v9 configuration with TypeScript, React, and React Native rules
- **Error Handling**: Comprehensive error boundaries and graceful error handling
- **Storage Resilience**: AsyncStorage operations handle errors gracefully
- **Single Source of Truth**: Consolidated API service (`discourseApi`) used throughout

### Testing

The project includes comprehensive testing:
- Unit tests for utilities and components
- Integration tests for authentication flow
- Component tests with React Native Testing Library

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.

---

Built with ❤️ using React Native and Expo
