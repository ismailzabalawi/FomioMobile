import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * ByteBlogPageSkeleton - Loading placeholder for ByteBlogPage
 * 
 * UI Spec:
 * - Matches ByteBlogPageHeader layout structure
 * - Title (3 lines)
 * - Avatar + Username + Category badge row
 * - Date · Reading time row
 * - Stats row (Replies · Likes · Views)
 * - Content lines (multiple)
 * - Uses muted colors with opacity
 * - Animated shimmer effect using react-native-reanimated
 */
export function ByteBlogPageSkeleton({ isDark }: { isDark: boolean }) {
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
    <View className={`flex-1 px-4 pt-0.5 ${isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}>
      {/* Title skeleton - 3 lines */}
      <View className="mb-5 gap-2">
        <Animated.View 
          className={`w-full h-7 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-5/6 h-7 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-4/6 h-7 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
      </View>

      {/* Avatar + Username + Category badge row */}
      <View className="flex-row items-center mb-3 gap-2">
        {/* Avatar skeleton */}
        <Animated.View 
          className={`w-8 h-8 rounded-full ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        {/* Username skeleton */}
        <Animated.View 
          className={`w-24 h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        {/* Category badge skeleton */}
        <Animated.View 
          className={`w-20 h-5 rounded-full ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
      </View>

      {/* Date · Reading time row */}
      <View className="flex-row items-center mb-3 gap-2">
        <Animated.View 
          className={`w-20 h-3 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-16 h-3 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
      </View>

      {/* Stats row (Replies · Likes · Views) */}
      <View className="flex-row items-center mb-5 gap-2">
        <Animated.View 
          className={`w-16 h-3 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-14 h-3 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-14 h-3 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
      </View>

      {/* Content skeleton - multiple lines */}
      <View className="mb-8 gap-3">
        <Animated.View 
          className={`w-full h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-full h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-5/6 h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-full h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-4/6 h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
        <Animated.View 
          className={`w-full h-4 rounded-md ${isDark ? 'bg-fomio-muted-dark' : 'bg-fomio-muted'}`}
          style={animatedStyle}
        />
      </View>
    </View>
  );
}

