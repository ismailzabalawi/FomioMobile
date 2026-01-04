import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '@/shared/query-client';
import '../global.css';
import { FoldingFeatureProvider } from '@logicwind/react-native-fold-detection';

import { ThemeProvider, useTheme } from '@/components/theme';
import { AuthProvider, useAuth } from '@/shared/auth-context';
import { attachIntentReplay } from '@/shared/intent-replay';
import { useIntentReplay } from '@/shared/hooks/useIntentReplay';
import { discourseApi } from '@/shared/discourseApi';
import { logger } from '@/shared/logger';
import { handleDeepLink, isFomioDeepLink } from '@/lib/deep-link-handler';
import * as Linking from 'expo-linking';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, GlobalHeader } from '@/components/ui/header';
import { useHeader } from '@/components/ui/header';
import { ToastContainer } from '@/components/shared/ToastContainer';

// Global flag to prevent duplicate deep link initialization across remounts (foldable screen changes)
let deepLinkInitialized = false;

// FoldingFeatureProvider enables native foldable posture detection in dev/EAS builds.
// The useFoldableLayout hook still falls back to width heuristics when native info is unavailable.

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Context to signal when navigation is ready
const NavigationReadyContext = React.createContext<{
  markNavigationReady: () => void;
}>({
  markNavigationReady: () => {},
});

/**
 * Component that coordinates font loading, auth initialization, and navigation readiness
 * Only hides splash screen when all are ready to prevent jumpy initial load
 */
function InitializationCoordinator({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const [fontsReady, setFontsReady] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const hideSplashCalled = useRef(false);

  // Wait for fonts to load
  useEffect(() => {
    // Small delay to ensure fonts are truly loaded
    const timer = setTimeout(() => {
      setFontsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Coordinate hiding splash screen when fonts, auth, and navigation are ready
  useEffect(() => {
    if (fontsReady && !isAuthLoading && navigationReady && !hideSplashCalled.current) {
      hideSplashCalled.current = true;
      // Add a delay to ensure smooth transition and all screens are painted
      const hideTimer = setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          console.warn('Failed to hide splash screen:', splashError);
        }
      }, 250); // Delay to ensure all screens are loaded and painted
      return () => clearTimeout(hideTimer);
    }
  }, [fontsReady, isAuthLoading, navigationReady]);

  const markNavigationReady = React.useCallback(() => {
    setNavigationReady(true);
  }, []);

  // Render children immediately so navigation can initialize
  return (
    <NavigationReadyContext.Provider value={{ markNavigationReady }}>
      {children}
    </NavigationReadyContext.Provider>
  );
}

export default function RootLayout(): React.ReactElement | null {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) {
      // Log font loading error but don't crash the app
      console.warn('Font loading error:', error);
      // Allow app to continue without custom fonts
    }
  }, [error]);

  // Don't block rendering if fonts fail to load
  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          buster: '1.0.0', // Increment to invalidate cache on app updates
        }}
      >
        <BottomSheetModalProvider>
          <FoldingFeatureProvider>
            <ThemeProvider defaultTheme="system">
              <AuthProvider>
                <InitializationCoordinator>
                  <RootLayoutNav />
                </InitializationCoordinator>
              </AuthProvider>
            </ThemeProvider>
          </FoldingFeatureProvider>
        </BottomSheetModalProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav(): React.ReactElement {
  const { navigationTheme } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const isInitializedRef = useRef(false);

  // Set up intent replay for deep links that required auth
  // This listens for auth:signed-in and replays any pending navigation intent
  useIntentReplay();

  // Set up unified deep link listener for all fomio:// URLs
  // Handles: bytes, terets, hubs, profiles, search, compose, settings, notifications, home
  // Auth callbacks are handled as a special case within the handler
  // Uses global flag + ref to prevent duplicate initialization on foldable screen changes
  // Waits for auth to load before processing to correctly gate auth-required routes
  useEffect(() => {
    // Wait for auth state to be ready before processing deep links
    if (authLoading) {
      return;
    }

    // Skip if already initialized globally (prevents conflicts on foldable remounts)
    if (deepLinkInitialized || isInitializedRef.current) {
      logger.info('Deep link handler already initialized, skipping duplicate setup');
      return;
    }
    
    deepLinkInitialized = true;
    isInitializedRef.current = true;
    
    // Handle deep links while app is running (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('Deep link received (warm start)', { 
        url, 
        platform: Platform.OS,
        isFomio: isFomioDeepLink(url),
        isAuthenticated,
      });
      
      // Use unified handler - warm start uses push() to add route to stack
      if (isFomioDeepLink(url)) {
        handleDeepLink(url, false, isAuthenticated);
      }
    });

    // Handle initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && isFomioDeepLink(url)) {
        logger.info('Deep link received (cold start)', { url, isAuthenticated });
        // Delay slightly to ensure router is ready
        setTimeout(() => {
          // Cold start uses replace() for clean back stack, pass auth state
          handleDeepLink(url, true, isAuthenticated);
        }, 150);
      }
    }).catch((error) => {
      logger.error('Error getting initial URL', error);
    });

    return () => {
      subscription.remove();
      // Don't reset global flag on cleanup - prevents re-initialization on foldable changes
    };
  }, [authLoading, isAuthenticated]);

  // Set up intent replay for anonymous user actions
  useEffect(() => {
    const unsubscribe = attachIntentReplay({
      like: async (postId: string) => {
        try {
          logger.info('Replaying like intent for post', { postId });
          const postIdNum = parseInt(postId, 10);
          
          if (isNaN(postIdNum)) {
            throw new Error(`Invalid post ID: ${postId}`);
          }

          // Try to like as a byte first (handles topic -> first post conversion)
          const response = await discourseApi.likeByte(postIdNum);
          
          if (!response.success) {
            // If that fails, try direct post like
            const directResponse = await discourseApi.likePost(postIdNum);
            if (!directResponse.success) {
              throw new Error(directResponse.error || 'Failed to like post');
            }
          }
          
          logger.info('Like intent replayed successfully', { postId });
        } catch (error) {
          logger.error('Failed to replay like intent', error, { postId });
          throw error;
        }
      },
      comment: async (postId: string, payload?: any) => {
        try {
          logger.info('Replaying comment intent for post', { postId, payload });
          const byteId = parseInt(postId, 10);
          
          if (isNaN(byteId)) {
            throw new Error(`Invalid byte ID: ${postId}`);
          }

          // Navigate to byte detail page with comment input focused
          // Comment creation requires user input, so we just navigate to the detail page
          router.push(`/feed/${byteId}?showComments=true` as any);
          
          logger.info('Comment intent replayed - navigated to byte detail', { byteId });
        } catch (error) {
          logger.error('Failed to replay comment intent', error, { postId });
          throw error;
        }
      },
      bookmark: async (postId: string) => {
        try {
          logger.info('Replaying bookmark intent for post', { postId });
          const postIdNum = parseInt(postId, 10);
          
          if (isNaN(postIdNum)) {
            throw new Error(`Invalid post ID: ${postId}`);
          }

          // For bookmarks, we need to get the first post ID from the topic
          // Try to get the topic first to find the first post
          const topicResponse = await discourseApi.getTopic(postIdNum);
          
          if (topicResponse.success && topicResponse.data?.post_stream?.posts?.[0]) {
            const firstPostId = topicResponse.data.post_stream.posts[0].id;
            const response = await discourseApi.bookmarkPost(firstPostId);
            
            if (!response.success) {
              throw new Error(response.error || 'Failed to bookmark post');
            }
          } else {
            // If it's already a post ID, try direct bookmark
            const response = await discourseApi.bookmarkPost(postIdNum);
            if (!response.success) {
              throw new Error(response.error || 'Failed to bookmark post');
            }
          }
          
          logger.info('Bookmark intent replayed successfully', { postId });
        } catch (error) {
          logger.error('Failed to replay bookmark intent', error, { postId });
          throw error;
        }
      },
      onSuccess: (intent) => {
        logger.info('Intent replayed successfully', { intent });
        // Intent replay completed - user can see the result in the UI
      },
      onError: (intent, error) => {
        logger.error('Failed to replay intent', error, { intent });
        // Error logged - user can retry the action manually if needed
      },
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <HeaderProvider>
      <NavigationThemeProvider value={navigationTheme}>
        <RootLayoutContent insets={insets} />
      </NavigationThemeProvider>
    </HeaderProvider>
  );
}

function RootLayoutContent({ insets }: { insets: { top: number } }): React.ReactElement {
  const { header } = useHeader();
  const { markNavigationReady } = React.useContext(NavigationReadyContext);
  const navigationReadyCalled = useRef(false);

  // Signal that navigation is ready after first render
  useEffect(() => {
    if (!navigationReadyCalled.current) {
      navigationReadyCalled.current = true;
      // Small delay to ensure navigation stack is fully initialized
      const timer = setTimeout(() => {
        markNavigationReady();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [markNavigationReady]);

  // Use measured header height, fallback to calculated default
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
  const HEADER_PADDING = Platform.OS === 'ios' ? 4 : 2;
  const baseHeaderHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
  const measuredHeaderHeight = header.headerHeight ?? baseHeaderHeight;

  // When extendToStatusBar is true, header extends into status bar area
  // So we don't need to offset by insets.top
  const headerTop = header.extendToStatusBar ? 0 : insets.top;

  // Calculate content padding: when extendToStatusBar is true, the header's measured height
  // includes the status bar area padding, but we only want to push content by the actual header bar height
  // So we subtract insets.top from the measured height when extendToStatusBar is true
  // When extendToStatusBar is false, we need to add headerTop to account for the header's offset
  const contentPaddingTop = header.extendToStatusBar && measuredHeaderHeight > baseHeaderHeight
    ? measuredHeaderHeight - insets.top
    : measuredHeaderHeight + headerTop;

  return (
    <View style={styles.container}>
      {/* GlobalHeader positioned after status bar */}
      <View style={[styles.headerContainer, { top: headerTop }]}>
        <GlobalHeader />
      </View>
      {/* ToastContainer positioned below header */}
      <ToastContainer />
      {/* Add padding to push content below header */}
      <View style={{ paddingTop: contentPaddingTop, flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            presentation: 'card',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="(profile)" />
          <Stack.Screen name="feed" />
          <Stack.Screen name="teret" />
          <Stack.Screen name="hub" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="(debug)" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="auth_redirect" />
          <Stack.Screen
            name="compose"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000, // Ensure header is above all content
  },
});
