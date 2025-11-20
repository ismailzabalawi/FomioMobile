// UI Spec: ProfileBadgeStrip
// - Horizontal pill strip
// - Placeholder badges with lock icon
// - "Coming soon" text
// - Greyed out appearance

import React from 'react';
import { View, Text } from 'react-native';
import { Lock } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';

export function ProfileBadgeStrip() {
  const { isDark, isAmoled } = useTheme();

  return (
    <View className="px-4 py-4">
      <View
        className="flex-row items-center gap-2 py-3 px-4 rounded-xl border"
        style={{
          backgroundColor: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          opacity: 0.6,
        }}
      >
        <Lock
          size={16}
          color={isDark ? '#6b7280' : '#9ca3af'}
          weight="regular"
        />
        <Text
          className="text-sm font-medium"
          style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
        >
          Badges coming soon
        </Text>
      </View>
    </View>
  );
}

