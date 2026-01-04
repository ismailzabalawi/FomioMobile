/**
 * Debug Layout - Dev-only screens for testing and debugging
 * 
 * These screens are only accessible in development builds.
 * They provide tools for testing deep links, inspecting state, etc.
 */

import { Stack, Redirect } from 'expo-router';
import { useTheme } from '@/components/theme';

export default function DebugLayout(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();

  // Only allow access in development mode
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#18181b' : '#ffffff',
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="deep-links" />
    </Stack>
  );
}

