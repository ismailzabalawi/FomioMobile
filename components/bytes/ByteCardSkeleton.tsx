import React from 'react';
import { View } from 'react-native';

/**
 * ByteCardSkeleton - Loading placeholder for ByteCard
 * 
 * UI Spec:
 * - Matches ByteCard layout structure
 * - Uses muted colors with opacity
 * - Animated shimmer (future enhancement)
 */
export function ByteCardSkeleton() {
  return (
    <View className="px-4 py-4">
      <View className="flex-row gap-3">
        {/* Avatar skeleton */}
        <View className="w-10 h-10 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-full" />
        
        {/* Content skeleton */}
        <View className="flex-1 gap-2">
          {/* Name + timestamp */}
          <View className="w-32 h-4 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-md" />
          
          {/* Content lines */}
          <View className="w-full h-4 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-md" />
          <View className="w-44 h-4 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-md" />
          
          {/* Footer actions */}
          <View className="flex-row gap-6 mt-3">
            <View className="w-12 h-4 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-md" />
            <View className="w-12 h-4 bg-fomio-muted dark:bg-fomio-muted-dark opacity-20 rounded-md" />
          </View>
        </View>
      </View>
      
      {/* Separator */}
      <View className="h-[1px] bg-fomio-border-soft dark:bg-fomio-border-soft-dark opacity-20 mt-3" />
    </View>
  );
}

