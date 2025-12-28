// UI Spec: ProfileStats
// - Horizontal row: Bytes count, Replies count, Likes received, Trust Level
// - Format: "1,218 Bytes · 324 Replies · TL2 Member"
// - Muted grey, medium weight
// - Uses data from DiscourseUser interface

import React, { useMemo } from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/components/theme';
import { DiscourseUser } from '@/shared/discourseApi';
import { getTokens } from '@/shared/design/tokens';

export interface ProfileStatsProps {
  user: DiscourseUser;
  containerStyle?: StyleProp<ViewStyle>;
  textAlign?: 'left' | 'center';
}

export function ProfileStats({ user, containerStyle, textAlign = 'center' }: ProfileStatsProps) {
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

  const statsText = stats
    .map((stat) => `${stat.value} ${stat.label}`)
    .join(' · ');

  return (
    <View className="px-4" style={[{ width: '100%', marginTop: 6 }, containerStyle]}>
      <Text
        className="text-xs"
        style={{ color: tokens.colors.muted, textAlign }}
        numberOfLines={1}
      >
        {statsText}
      </Text>
    </View>
  );
}
