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
  
  return (
    <View className="px-4 pt-6 pb-4" style={{ backgroundColor, flex: 1 }}>
      {/* Hero cover */}
      <View className="mb-4 rounded-2xl overflow-hidden" style={{ height: 160 }}>
        <SkeletonEnhanced width="100%" height={160} />
      </View>

      {/* Avatar + name stack */}
      <View className="items-center" style={{ marginTop: -56 }}>
        <SkeletonEnhanced width={88} height={88} borderRadius={44} />
        <View className="mt-3 items-center">
          <SkeletonEnhanced
            width={140}
            height={26}
            borderRadius={6}
            style={{ marginBottom: 8 }}
          />
          <SkeletonEnhanced width={90} height={16} borderRadius={6} />
        </View>
      </View>

      {/* Stats pill */}
      <View className="mt-6 mb-4">
        <SkeletonEnhanced width="100%" height={52} borderRadius={14} />
      </View>

      {/* Actions row */}
      <View className="mb-6">
        <SkeletonEnhanced width="100%" height={44} borderRadius={12} />
      </View>

      {/* Tab bar */}
      <View className="mb-2">
        <SkeletonEnhanced width="100%" height={56} borderRadius={18} />
      </View>
    </View>
  );
}
