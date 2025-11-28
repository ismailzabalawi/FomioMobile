import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * ByteCardSkeleton - Loading placeholder for ByteCard
 * 
 * UI Spec:
 * - Matches ByteCard layout structure
 * - Uses muted colors with opacity
 * - Animated shimmer effect using react-native-reanimated
 */
export function ByteCardSkeleton() {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 1000 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View className="px-4 py-4">
      <View className="flex-row gap-3">
        {/* Avatar skeleton */}
        <Animated.View 
          className="w-10 h-10 bg-fomio-muted dark:bg-fomio-muted-dark rounded-full"
          style={animatedStyle}
        />
        
        {/* Content skeleton */}
        <View className="flex-1 gap-2">
          {/* Name + timestamp */}
          <Animated.View 
            className="w-32 h-4 bg-fomio-muted dark:bg-fomio-muted-dark rounded-md"
            style={animatedStyle}
          />
          
          {/* Content lines */}
          <Animated.View 
            className="w-full h-4 bg-fomio-muted dark:bg-fomio-muted-dark rounded-md"
            style={animatedStyle}
          />
          <Animated.View 
            className="w-44 h-4 bg-fomio-muted dark:bg-fomio-muted-dark rounded-md"
            style={animatedStyle}
          />
          
          {/* Footer actions */}
          <View className="flex-row gap-6 mt-3">
            <Animated.View 
              className="w-12 h-4 bg-fomio-muted dark:bg-fomio-muted-dark rounded-md"
              style={animatedStyle}
            />
            <Animated.View 
              className="w-12 h-4 bg-fomio-muted dark:bg-fomio-muted-dark rounded-md"
              style={animatedStyle}
            />
          </View>
        </View>
      </View>
      
      {/* Separator */}
      <View className="h-[1px] bg-fomio-border-soft dark:bg-fomio-border-soft-dark opacity-20 mt-3" />
    </View>
  );
}

