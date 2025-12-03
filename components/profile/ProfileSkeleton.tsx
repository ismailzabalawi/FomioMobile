// UI Spec: ProfileSkeleton
// - Loading skeleton for profile screen
// - Matches ProfileHeader layout structure
// - Uses SkeletonEnhanced for shimmer animation
// - Proper spacing (16-24px vertical rhythm)

import React from 'react';
import { View } from 'react-native';
import { SkeletonEnhanced } from '@/components/shared/loading.enhanced';

export function ProfileSkeleton() {
  return (
    <View className="px-4 pt-6 pb-4">
      {/* Avatar */}
      <View className="mb-4">
        <SkeletonEnhanced 
          width={72} 
          height={72} 
          borderRadius={36} 
        />
      </View>

      {/* Name and Username */}
      <View className="mb-2">
        <SkeletonEnhanced 
          width="60%" 
          height={28} 
          borderRadius={4}
          style={{ marginBottom: 8 }}
        />
        <SkeletonEnhanced 
          width="40%" 
          height={18} 
          borderRadius={4}
        />
      </View>

      {/* Meta row (joined date) */}
      <View className="flex-row items-center gap-3 mt-2">
        <SkeletonEnhanced 
          width={140} 
          height={16} 
          borderRadius={4}
        />
      </View>
    </View>
  );
}

