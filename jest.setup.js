// Jest setup file for React Native testing

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: ({ children, href, ...props }) => children,
  Redirect: () => null,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

// Mock Expo SplashScreen
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  
  // Add missing methods that might be used
  Reanimated.default.useSharedValue = (initialValue) => ({ value: initialValue });
  Reanimated.default.useAnimatedStyle = () => ({});
  Reanimated.default.withTiming = (value) => value;
  Reanimated.default.withSpring = (value) => value;
  Reanimated.default.runOnJS = (fn) => fn;
  
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
// Note: This path doesn't exist in React Native 0.81+, so we skip this mock
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock TurboModuleRegistry for React Native 0.81+
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({
      Dimensions: { window: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
      fontScale: 1,
      pixelRatio: 1,
    })),
  })),
  get: jest.fn(() => ({
    getConstants: jest.fn(() => ({
      Dimensions: { window: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
      fontScale: 1,
      pixelRatio: 1,
    })),
  })),
}));

// Mock react-native with all necessary mocks
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StyleSheet: {
      ...RN.StyleSheet,
      create: jest.fn((styles) => styles),
      hairlineWidth: 1,
      flatten: jest.fn((style) => {
        if (!style) return {};
        if (Array.isArray(style)) {
          return style.reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
        }
        return style;
      }),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    PixelRatio: {
      get: jest.fn(() => 1),
      roundToNearestPixel: jest.fn((value) => value),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size) => size),
    },
  };
});

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore specific console outputs during tests
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Setup environment variables for testing
process.env.EXPO_PUBLIC_DISCOURSE_URL = 'https://meta.techrebels.info';
// Note: This app uses User API Keys, no admin API credentials needed
process.env.EXPO_PUBLIC_ENABLE_HTTPS_ONLY = 'true';
process.env.EXPO_PUBLIC_ENABLE_RATE_LIMITING = 'true';
process.env.EXPO_PUBLIC_ENABLE_DEBUG_MODE = 'false';
process.env.EXPO_PUBLIC_ENABLE_MOCK_DATA = 'false';

// Setup fake timers
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

