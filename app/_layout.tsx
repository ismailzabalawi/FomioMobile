import 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { attachIntentReplay } from '@/shared/intent-replay';
import { discourseApi } from '@/shared/discourseApi';
import { logger } from '@/shared/logger';

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

  return <RootLayoutNav />;
}

function RootLayoutNav(): React.ReactElement {
  const colorScheme = useColorScheme();

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
    <ThemeProvider defaultTheme="system">
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: 'transparent',
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="feed" />
        </Stack>
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}

