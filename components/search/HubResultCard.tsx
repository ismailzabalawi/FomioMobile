import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { Hub } from '@/shared/discourseApi';

interface HubResultCardProps {
  hub: Hub;
  onPress?: () => void;
}

export function HubResultCard({ hub, onPress }: HubResultCardProps) {
  const { isDark, isAmoled } = useTheme();
  const tokens = useMemo(
    () => getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isAmoled, isDark]
  );

  const color = hub.color || tokens.colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          padding: 16,
          backgroundColor: tokens.colors.surfaceFrost,
          borderColor: tokens.colors.border,
          borderWidth: 1,
          borderRadius: tokens.radii.lg,
        },
        tokens.shadows.soft,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${hub.name} hub`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: `${color}55`,
          }}
        >
          <Text style={{ color, fontSize: 18, fontWeight: '700' }}>
            {hub.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: tokens.colors.text,
              fontSize: 16,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {hub.name}
          </Text>
          {!!hub.description && (
            <Text
              style={{
                color: tokens.colors.muted,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {hub.description}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {hub.topicsCount} topic{hub.topicsCount === 1 ? '' : 's'}
        </Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {hub.postsCount} post{hub.postsCount === 1 ? '' : 's'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
