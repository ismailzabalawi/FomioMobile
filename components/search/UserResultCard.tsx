import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { AppUser } from '@/shared/discourseApi';

interface UserResultCardProps {
  user: AppUser;
  onPress?: () => void;
}

export function UserResultCard({ user, onPress }: UserResultCardProps) {
  const { isDark, isAmoled } = useTheme();
  const tokens = useMemo(
    () => getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isAmoled, isDark]
  );

  const displayName = user.name || user.username || 'Unknown User';
  const subtitle = user.bio || user.joinedDate || '';
  const avatar = user.avatar || '';

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
      accessibilityLabel={displayName}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: tokens.colors.border,
            }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: tokens.colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: tokens.colors.border,
            }}
          >
            <Text style={{ color: tokens.colors.text, fontWeight: '600' }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: tokens.colors.text,
              fontSize: 16,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {!!user.username && (
            <Text
              style={{
                color: tokens.colors.muted,
                fontSize: 12,
                fontWeight: '500',
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              @{user.username}
            </Text>
          )}
        </View>
      </View>

      {!!subtitle && (
        <Text
          style={{
            color: tokens.colors.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 10,
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {user.bytes} byte{user.bytes === 1 ? '' : 's'}
        </Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12, fontWeight: '500' }}>
          {user.comments} comment{user.comments === 1 ? '' : 's'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
