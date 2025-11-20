// UI Spec: ProfileSectionTitle
// - Left-aligned section title
// - Simple text or divider style
// - Consistent spacing (24px top margin)

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/components/theme';

export interface ProfileSectionTitleProps {
  title: string;
}

export function ProfileSectionTitle({ title }: ProfileSectionTitleProps) {
  const { isDark } = useTheme();

  return (
    <View className="px-4 pt-6 pb-3">
      <Text
        className="text-lg font-semibold"
        style={{ color: isDark ? '#f9fafb' : '#111827' }}
      >
        {title}
      </Text>
    </View>
  );
}

