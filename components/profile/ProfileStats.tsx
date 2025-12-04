// UI Spec: ProfileStats
// - Horizontal row: Bytes count, Replies count, Likes received, Trust Level
// - Format: "1,218 Bytes · 324 Replies · TL2 Member"
// - Muted grey, medium weight
// - Uses data from DiscourseUser interface

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/components/theme';
import { DiscourseUser } from '@/shared/discourseApi';

export interface ProfileStatsProps {
  user: DiscourseUser;
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const { isDark } = useTheme();

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
    <View className="px-4 py-3" style={{ width: '100%', overflow: 'hidden' }}>
      <View className="flex-row items-center flex-wrap gap-2" style={{ width: '100%' }}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            <Text
              className="text-sm font-medium"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {stat.value} {stat.label}
            </Text>
            {index < stats.length - 1 && (
              <Text
                className="text-sm"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                ·
              </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

