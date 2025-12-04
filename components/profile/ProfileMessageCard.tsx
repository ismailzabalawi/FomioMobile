// UI Spec: ProfileMessageCard
// - Reusable card component for error, unauthenticated, and empty states
// - Consistent styling across all profile states
// - Supports icon (emoji or React component), title, body text, and primary action
// - Theme-aware colors using semantic tokens

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getThemeColors } from '@/shared/theme-constants';
import type { ThemeMode } from '@/components/theme';

export interface ProfileMessageCardProps {
  icon?: string | React.ReactElement;
  title: string;
  body: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
  themeMode?: ThemeMode;
  isDark?: boolean;
}

export function ProfileMessageCard({
  icon,
  title,
  body,
  primaryAction,
  themeMode = 'dark',
  isDark = true,
}: ProfileMessageCardProps) {
  const colors = getThemeColors(themeMode, isDark);
  
  const renderIcon = () => {
    if (!icon) return null;
    
    if (typeof icon === 'string') {
      // Emoji icon
      return <Text className="text-4xl mb-4">{icon}</Text>;
    }
    
    // React component icon
    return (
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: colors.muted }}
      >
        {icon}
      </View>
    );
  };

  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className="items-center max-w-sm">
        <View
          className="p-6 rounded-xl mb-4"
          style={{ backgroundColor: colors.card }}
        >
          <View className="items-center">
            {renderIcon()}
            <Text
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: colors.foreground }}
            >
              {title}
            </Text>
            <Text
              className="text-sm text-center mb-6"
              style={{ color: colors.mutedForeground }}
            >
              {body}
            </Text>
            {primaryAction && (
              <TouchableOpacity
                onPress={primaryAction.onPress}
                className="px-8 py-3 rounded-xl"
                style={{ backgroundColor: colors.accent }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={primaryAction.label}
                accessibilityHint={primaryAction.accessibilityHint}
              >
                <Text className="text-white font-semibold text-base">
                  {primaryAction.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

