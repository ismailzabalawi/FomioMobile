/**
 * Hub Layout - Stack navigation for Hub routes
 * 
 * Deep link: fomio://hub/{slug}
 * Maps to Discourse: Parent Category (no parent_category_id)
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/components/theme';

export default function HubLayout(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();

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
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}

