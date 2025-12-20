// UI Spec: ProfileMessageCard
// - Reusable card component for error, unauthenticated, and empty states
// - Consistent styling across all profile states
// - Supports icon (emoji or React component), title, body text, and primary action
// - Theme-aware colors using semantic tokens
// - Foldable-aware: responsive to device width changes, avoids hinge area
// - Defensive: null-safe props, handles missing data gracefully

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getTokens } from '@/shared/design/tokens';
import { FluidSection } from '@/shared/ui/FluidSection';
import { useFoldableLayout } from '@/shared/hooks/useFoldableLayout';

export interface ProfileMessageCardProps {
  icon?: string | React.ReactElement;
  title?: string; // Made optional for defensive rendering
  body?: string;  // Made optional for defensive rendering
  primaryAction?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
  mode?: 'light' | 'dark';
}

export function ProfileMessageCard({
  icon,
  title = '',
  body = '',
  primaryAction,
  mode = 'dark',
}: ProfileMessageCardProps) {
  const { width } = useWindowDimensions();
  const { paddingLeft, paddingRight } = useFoldableLayout();
  const tokens = useMemo(() => getTokens(mode), [mode]);

  // Calculate responsive card width and padding
  // - Max width of 520px for optimal readability
  // - Accounts for safe area insets and hinge padding
  // - Centers content on wide screens
  const layout = useMemo(() => {
    const availableWidth = width - paddingLeft - paddingRight;
    const maxCardWidth = Math.min(520, availableWidth - 32); // 32px total side padding (16px each)
    const horizontalPad = Math.max(16, (availableWidth - maxCardWidth) / 2);

    return {
      maxCardWidth,
      horizontalPad,
      availableWidth,
    };
  }, [width, paddingLeft, paddingRight]);

  // Defensive: Guard action handler to prevent crashes
  const handleActionPress = useCallback(() => {
    if (!primaryAction?.onPress) return;

    Haptics.selectionAsync().catch(() => {});
    try {
      primaryAction.onPress();
    } catch (error) {
      // Silently handle errors to prevent crashes
      console.warn('ProfileMessageCard: Action handler error', error);
    }
  }, [primaryAction]);

  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      // Emoji icon
      return <Text className="text-4xl mb-4">{icon}</Text>;
    }

    // React component icon - defensive rendering
    if (React.isValidElement(icon)) {
      return (
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: tokens.colors.surfaceMuted }}
        >
          {icon}
        </View>
      );
    }

    return null;
  };

  // Early return if no content to show (defensive)
  if (!title && !body && !icon) {
    return null;
  }

  const pageBackground = mode === 'dark' ? '#000000' : '#f8fafc';
  
  return (
    <View 
      className="flex-1 items-center justify-center"
      style={{ 
        paddingLeft: paddingLeft + layout.horizontalPad,
        paddingRight: paddingRight + layout.horizontalPad,
        backgroundColor: pageBackground,
      }}
    >
      <View 
        className="items-center w-full"
        style={{ maxWidth: layout.maxCardWidth, backgroundColor: pageBackground }}
      >
        <FluidSection
          mode={mode}
          style={{
            width: '100%',
            padding: 24,
            alignItems: 'center',
          }}
        >
          {renderIcon()}
          {title ? (
            <Text
              className="text-lg font-semibold text-center"
              style={{ color: tokens.colors.text }}
            >
              {title}
            </Text>
          ) : null}
          {body ? (
            <Text
              className="text-sm text-center mb-2"
              style={{ color: tokens.colors.muted }}
            >
              {body}
            </Text>
          ) : null}
          {primaryAction ? (
            <TouchableOpacity
              onPress={handleActionPress}
              className="px-8 py-3 rounded-xl"
              style={{
                backgroundColor: tokens.colors.accent,
                borderRadius: tokens.radii.md,
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={primaryAction.label ?? 'Action button'}
              accessibilityHint={primaryAction.accessibilityHint}
            >
              <Text className="text-white font-semibold text-base">
                {primaryAction.label ?? 'Action'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </FluidSection>
      </View>
    </View>
  );
}
