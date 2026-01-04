/**
 * Teret Layout - Stack navigation for Teret routes
 * 
 * Deep link: fomio://teret/{slug}
 * Maps to Discourse: Category (with parent_category_id)
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/components/theme';

export default function TeretLayout(): React.ReactElement {
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

