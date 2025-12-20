// UI Spec: ProfileStats
// - Horizontal row: Bytes count, Replies count, Likes received, Trust Level
// - Format: "1,218 Bytes · 324 Replies · TL2 Member"
// - Muted grey, medium weight
// - Uses data from DiscourseUser interface

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/components/theme';
import { DiscourseUser } from '@/shared/discourseApi';
import { getTokens } from '@/shared/design/tokens';
import { FluidSection } from '@/shared/ui/FluidSection';

export interface ProfileStatsProps {
  user: DiscourseUser;
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);

  const bytesCount = user.topic_count || 0;
  const repliesCount = Math.max(0, (user.post_count || 0) - (user.topic_count || 0));
  const likesReceived = user.likes_received || 0;
  const trustLevel = user.trust_level || 0;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getTrustLevelLabel = (level: number): string => {
    switch (level) {
      case 0:
        return 'New User';
      case 1:
        return 'TL1 Member';
      case 2:
        return 'TL2 Member';
      case 3:
        return 'TL3 Leader';
      case 4:
        return 'TL4 Elder';
      default:
        return 'Member';
    }
  };

  const stats = [
    { label: 'Bytes', value: formatNumber(bytesCount) },
    { label: 'Replies', value: formatNumber(repliesCount) },
    { label: 'Likes', value: formatNumber(likesReceived) },
    { label: 'Trust', value: getTrustLevelLabel(trustLevel) },
  ].filter((stat) => stat.value !== '0' || stat.label === 'Trust'); // Always show trust level

  return (
    <View className="px-4" style={{ width: '100%', marginTop: 16 }}>
      <FluidSection
        mode={mode}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text
                className="text-sm font-semibold"
                style={{ color: tokens.colors.text }}
              >
                {stat.value}
              </Text>
              <Text
                className="text-xs"
                style={{ color: tokens.colors.muted }}
              >
                {stat.label}
              </Text>
            </View>
            {index < stats.length - 1 && (
              <View
                style={{
                  width: 1,
                  height: 28,
                  backgroundColor: tokens.colors.border,
                  marginLeft: 12,
                }}
              />
            )}
          </View>
        ))}
      </FluidSection>
    </View>
  );
}
