// UI Spec: PremiumPostButton - Premium Edition
// - Gradient background with subtle glow
// - Animated loading state with shimmer
// - Success checkmark animation on post
// - Scale animation on press
// - Disabled state with reduced opacity
// - Character count indicator

import React, { useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { PaperPlaneTilt, Check, SpinnerGap } from 'phosphor-react-native';

type ButtonState = 'idle' | 'loading' | 'success';

interface PremiumPostButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  characterCount?: { current: number; min: number };
  hint?: string;
}

const SPRING_CONFIG = { damping: 14, stiffness: 280 };

export function PremiumPostButton({
  onPress,
  disabled = false,
  loading = false,
  success = false,
  characterCount,
  hint,
}: PremiumPostButtonProps) {
  const { isDark, isAmoled } = useTheme();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const checkScale = useSharedValue(0);

  // Determine current state
  const state: ButtonState = success ? 'success' : loading ? 'loading' : 'idle';

  // Loading spinner rotation
  useEffect(() => {
    if (loading) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [loading, rotation]);

  // Success checkmark animation
  useEffect(() => {
    if (success) {
      checkScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 300 }),
        withSpring(1, SPRING_CONFIG)
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    } else {
      checkScale.value = 0;
    }
  }, [success, checkScale]);

  // Glow effect on enabled state
  useEffect(() => {
    if (!disabled && !loading) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [disabled, loading, glowOpacity]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const spinnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = 0.96;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  // Gradient colors based on state
  const gradientColors: [string, string, string] = useMemo(() => {
    if (success) {
      return isDark
        ? ['#059669', '#10B981', '#34D399']
        : ['#059669', '#10B981', '#34D399'];
    }
    if (disabled) {
      return isDark
        ? ['#374151', '#4B5563', '#6B7280']
        : ['#9CA3AF', '#D1D5DB', '#E5E7EB'];
    }
    return isDark
      ? ['#0D7377', '#14919B', '#26A69A'] // Teal gradient for dark
      : ['#00796B', '#009688', '#26A69A']; // Teal gradient for light
  }, [isDark, disabled, success]);

  const showCharacterWarning =
    characterCount && characterCount.current < characterCount.min;

  return (
    <View style={styles.wrapper}>
      {/* Hint text */}
      {hint && !loading && !success && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.hintContainer}>
          <Text
            style={[
              styles.hintText,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
            ]}
          >
            {hint}
          </Text>
        </Animated.View>
      )}

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading || success}
        accessible
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Posting...' : success ? 'Posted!' : 'Post'}
        accessibilityState={{ disabled: disabled || loading }}
      >
        <Animated.View style={[styles.container, buttonAnimatedStyle]}>
          {/* Glow effect */}
          {!disabled && (
            <Animated.View
              style={[
                styles.glow,
                glowAnimatedStyle,
                {
                  backgroundColor: isDark ? '#26A69A' : '#009688',
                  shadowColor: isDark ? '#26A69A' : '#009688',
                },
              ]}
            />
          )}

          {/* Button content */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, disabled && styles.disabled]}
          >
            {state === 'loading' ? (
              <Animated.View style={spinnerAnimatedStyle}>
                <SpinnerGap size={22} color="#FFFFFF" weight="bold" />
              </Animated.View>
            ) : state === 'success' ? (
              <Animated.View style={checkAnimatedStyle}>
                <Check size={24} color="#FFFFFF" weight="bold" />
              </Animated.View>
            ) : (
              <View style={styles.content}>
                <PaperPlaneTilt
                  size={20}
                  color="#FFFFFF"
                  weight="fill"
                  style={styles.icon}
                />
                <Text style={styles.text}>Post</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Character count warning */}
      {showCharacterWarning && !loading && !success && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.warningContainer}>
          <Text
            style={[
              styles.warningText,
              { color: isDark ? '#FBBF24' : '#F59E0B' },
            ]}
          >
            {characterCount.current} / {characterCount.min} min characters
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    position: 'relative',
    width: '100%',
  },
  glow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        // Android doesn't support colored shadows, skip
        display: 'none',
      },
    }),
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 54,
  },
  disabled: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  hintContainer: {
    marginBottom: 12,
  },
  hintText: {
    fontSize: 13,
    textAlign: 'center',
  },
  warningContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

