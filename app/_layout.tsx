import 'react-native-reanimated';
import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import '../global.css';

import { ThemeProvider, useTheme } from '@/components/theme';
import { AuthProvider } from '@/shared/auth-context';
import { attachIntentReplay } from '@/shared/intent-replay';
import { discourseApi } from '@/shared/discourseApi';
import { logger } from '@/shared/logger';
import * as Linking from 'expo-linking';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, GlobalHeader } from '@/components/ui/header';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (loaded || error) {
      // Hide splash screen even if fonts failed to load
      SplashScreen.hideAsync().catch((splashError) => {
        console.warn('Failed to hide splash screen:', splashError);
      });
    }
  }, [loaded, error]);

  // Don't block rendering if fonts fail to load
  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav(): React.ReactElement {
  const { navigationTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate total header height to push content down
  // Header bar: 44px (iOS) or 48px (Android)
  // Plus internal padding: 8px (iOS) or 4px (Android)
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 48;
  const HEADER_PADDING = Platform.OS === 'ios' ? 8 : 4;
  const headerHeight = BASE_BAR_HEIGHT + HEADER_PADDING;

  // Set up deep link listener for Android auth redirects
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Handle deep links while app is running
      const subscription = Linking.addEventListener('url', ({ url }) => {
        logger.info('Deep link received via Linking listener', { url, platform: Platform.OS });
        
        // Check if this is an auth callback deep link
        // Support both fomio://auth/callback and fomio://auth_redirect formats
        if (
          url.includes('fomio://auth/callback') || 
          url.includes('fomio:///auth/callback') ||
          url.includes('fomio://auth_redirect') ||
          url.includes('fomio:///auth_redirect')
        ) {
          logger.info('Auth callback deep link detected, extracting payload and navigating', { url });
          
          // Extract payload directly from the URL
          const urlParams = new URLSearchParams(url.split('?')[1] || '');
          const payload = urlParams.get('payload');
          
          if (payload) {
            // Navigate with payload as direct param
            logger.info('Payload extracted from deep link, navigating to callback screen');
            router.replace(`/auth/callback?payload=${encodeURIComponent(payload)}` as any);
          } else {
            // Fallback: pass full URL
            logger.warn('No payload found in deep link, passing full URL');
            router.replace(`/auth/callback?url=${encodeURIComponent(url)}` as any);
          }
        }
      });

      // Handle initial URL (cold start)
      Linking.getInitialURL().then((url) => {
        if (url) {
          logger.info('Initial deep link URL detected', { url, platform: Platform.OS });
          // Support both fomio://auth/callback and fomio://auth_redirect formats
          if (
            url.includes('fomio://auth/callback') || 
            url.includes('fomio:///auth/callback') ||
            url.includes('fomio://auth_redirect') ||
            url.includes('fomio:///auth_redirect')
          ) {
            logger.info('Initial auth callback deep link detected', { url });
            
            // Extract payload directly from the URL
            const urlParams = new URLSearchParams(url.split('?')[1] || '');
            const payload = urlParams.get('payload');
            
            if (payload) {
              router.replace(`/auth/callback?payload=${encodeURIComponent(payload)}` as any);
            } else {
              router.replace(`/auth/callback?url=${encodeURIComponent(url)}` as any);
            }
          }
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

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
        <View style={styles.container}>
          {/* GlobalHeader positioned after status bar */}
          <View style={[styles.headerContainer, { top: insets.top }]}>
            <GlobalHeader />
          </View>
          {/* Add padding to push content below header */}
          <View style={{ paddingTop: headerHeight, flex: 1 }}>
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
            </Stack>
          </View>
        </View>
      </NavigationThemeProvider>
    </HeaderProvider>
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