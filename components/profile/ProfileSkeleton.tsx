// UI Spec: ProfileSkeleton
// - Loading skeleton for profile screen
// - Matches ProfileHeader layout structure
// - Uses SkeletonEnhanced for shimmer animation
// - Proper spacing (16-24px vertical rhythm)

import React from 'react';
import { View } from 'react-native';
import { SkeletonEnhanced } from '@/components/shared/loading.enhanced';
import { useTheme } from '@/components/theme';

export function ProfileSkeleton() {
  const { isDark } = useTheme();
  const backgroundColor = isDark ? '#000000' : '#f8fafc';

  const heroHeight = 112;
  const avatarSize = 72;

  return (
    <View style={{ backgroundColor, flex: 1 }}>
      {/* Hero cover */}
      <View
        style={{
          height: heroHeight,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          overflow: 'hidden',
        }}
      >
        <SkeletonEnhanced width="100%" height={heroHeight} />
      </View>

      {/* Avatar + name stack */}
      <View style={{ marginTop: -avatarSize / 2, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SkeletonEnhanced width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonEnhanced width={160} height={22} borderRadius={6} />
            <SkeletonEnhanced width={110} height={14} borderRadius={6} />
            <SkeletonEnhanced width={210} height={12} borderRadius={6} />
          </View>
        </View>
      </View>

      {/* Bio line */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SkeletonEnhanced width="100%" height={16} borderRadius={6} />
      </View>

      {/* Stats line */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SkeletonEnhanced width="70%" height={14} borderRadius={6} />
      </View>

      {/* Actions row */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <SkeletonEnhanced width="100%" height={44} borderRadius={12} />
      </View>

      {/* Tab bar */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <SkeletonEnhanced width="100%" height={52} borderRadius={20} />
      </View>
    </View>
  );
}
