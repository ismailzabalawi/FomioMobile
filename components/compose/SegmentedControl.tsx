// UI Spec: SegmentedControl - Premium Edition
// - Animated sliding indicator with spring physics
// - Haptic feedback on segment change
// - Glass-morphism background
// - Smooth color transitions
// - Fully accessible

import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, LayoutChangeEvent, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  size?: 'sm' | 'md';
}

const SPRING_CONFIG = { damping: 18, stiffness: 280, mass: 0.8 };

export function SegmentedControl<T extends string>({
  segments,
  selectedValue,
  onValueChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const { isDark, isAmoled } = useTheme();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const selectedIndex = segments.findIndex((s) => s.value === selectedValue);
  const segmentWidth = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  // Animated position of the sliding indicator
  const indicatorPosition = useDerivedValue(() => {
    const width = segmentWidth.value;
    return withSpring(selectedIndex * width, SPRING_CONFIG);
  }, [selectedIndex]);

  // Animated style for the sliding indicator
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: segmentWidth.value,
  }));

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    containerWidth.value = width;
    segmentWidth.value = width / segments.length;
  }, [segments.length, containerWidth, segmentWidth]);

  const handlePress = useCallback(
    (value: T) => {
      if (value !== selectedValue) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onValueChange(value);
      }
    },
    [selectedValue, onValueChange]
  );

  // Size variants - Android gets significantly reduced padding for lighter feel
  const isAndroid = Platform.OS === 'android';
  // Slightly taller on both platforms so icon-only pills align with adjacent controls
  const paddingY = size === 'sm' ? (isAndroid ? 6 : 10) : (isAndroid ? 4 : 8);
  const paddingX = size === 'sm' ? (isAndroid ? 8 : 12) : (isAndroid ? 10 : 16);
  const fontSize = size === 'sm' ? 13 : 14;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)')
            : (Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.06)'),
          borderColor: isDark
            ? (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.06)')
            : (Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0, 0, 0, 0.04)'),
        },
      ]}
    >
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          indicatorStyle,
          {
            backgroundColor: isDark
              ? (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.15)')
              : (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
            shadowColor: Platform.OS === 'ios' ? (isDark ? tokens.colors.accent : '#000') : 'transparent',
            shadowOpacity: Platform.OS === 'ios' ? (isDark ? 0.25 : 0.08) : 0,
            shadowRadius: Platform.OS === 'ios' ? (isDark ? 8 : 4) : 0,
            shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : { width: 0, height: 0 },
          },
        ]}
      />

      {/* Segments */}
      {segments.map((segment, index) => {
        const isSelected = segment.value === selectedValue;
        const hasLabel = segment.label && segment.label.length > 0;

        return (
          <Pressable
            key={segment.value}
            onPress={() => handlePress(segment.value)}
            style={[styles.segment, { paddingVertical: paddingY, paddingHorizontal: paddingX }]}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={segment.label}
          >
            {segment.icon && (
              <View style={[styles.segmentIcon, !hasLabel && styles.segmentIconSolo]}>
                {segment.icon}
              </View>
            )}
            {hasLabel && (
              <Text
                style={[
                  styles.segmentText,
                  {
                    fontSize,
                    color: isSelected
                      ? isDark
                        ? '#FFFFFF'
                        : '#000000'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.5)'
                      : 'rgba(0, 0, 0, 0.45)',
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {segment.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Platform.OS === 'android' ? 8 : 12,
    borderWidth: Platform.OS === 'android' ? 0.5 : 1,
    padding: Platform.OS === 'android' ? 1 : 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 1 : 3,
    bottom: Platform.OS === 'android' ? 1 : 3,
    borderRadius: Platform.OS === 'android' ? 7 : 9,
    elevation: Platform.OS === 'android' ? 0 : 2,
    shadowOpacity: Platform.OS === 'android' ? 0 : undefined,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentIconSolo: {
    marginRight: 0,
  },
  segmentText: {
    textAlign: 'center',
  },
});
