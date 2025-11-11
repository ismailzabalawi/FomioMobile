import { Stack } from 'expo-router';
import { useTheme } from '@/components/theme';

export default function ProfileLayout() {
  const { isDark, isAmoled } = useTheme();
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
