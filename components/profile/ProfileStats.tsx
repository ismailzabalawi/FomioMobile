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
  isPublic?: boolean;
}

export function ProfileStats({
  user,
  containerStyle,
  textAlign = 'center',
  isPublic = false,
}: ProfileStatsProps) {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const lastSeen = isPublic && user.last_seen_at
    ? (() => {
        const lastSeenDate = new Date(user.last_seen_at);
        const now = new Date();
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return 'Online recently';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return lastSeenDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      })()
    : null;

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

  const metaParts = [
    joinedDate ? `Joined ${joinedDate}` : null,
    lastSeen ? `Last seen ${lastSeen}` : null,
  ].filter(Boolean);

  const statsText = [
    ...metaParts,
    ...stats.map((stat) => `${stat.value} ${stat.label}`),
  ].join(' · ');

  return (
    <View className="px-4" style={[{ width: '100%', marginTop: 0 }, containerStyle]}>
      <Text
        className="text-xs"
        style={{ color: tokens.colors.muted, textAlign, lineHeight: 16 }}
        numberOfLines={2}
      >
        {statsText}
      </Text>
    </View>
  );
}
