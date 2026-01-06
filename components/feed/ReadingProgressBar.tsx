import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

interface ReadingProgressBarProps {
  scrollProgress: number; // 0 to 1
}

/**
 * ReadingProgressBar - Thin animated progress bar at top of screen
 * 
 * UI Spec: ReadingProgressBar
 * - Fixed at top of screen (below header)
 * - Width based on scroll percentage (0-100%)
 * - Uses react-native-reanimated for smooth animation
 * - Themed with accent color
 * - Height: 2px for subtle appearance
 */
export function ReadingProgressBar({ scrollProgress }: ReadingProgressBarProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = getTokens(mode);
  
  const width = useSharedValue(0);
  
  useEffect(() => {
    // Animate width based on scroll progress (0-100%)
    width.value = withTiming(scrollProgress * 100, {
      duration: 150,
    });
  }, [scrollProgress, width]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  });
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.border,
          opacity: 0.2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          {
            backgroundColor: tokens.colors.accent,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1000,
  },
  progress: {
    height: 2,
  },
});

