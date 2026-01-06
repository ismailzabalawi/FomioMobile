// UI Spec: TeretChip - Premium Edition
// - Pill-shaped chip with teret color indicator
// - Shows Hub › Teret breadcrumb when selected
// - Animated press scale with spring physics
// - Premium shadow and border styling
// - Shimmer effect when unselected (optional)

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
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
import { CaretDown, CaretRight } from 'phosphor-react-native';
import { Teret } from '@/shared/useTerets';

interface TeretChipProps {
  selectedTeret: Teret | null;
  onPress: () => void;
  disabled?: boolean;
  error?: boolean;
}

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

export function TeretChip({
  selectedTeret,
  onPress,
  disabled = false,
  error = false,
}: TeretChipProps) {
  const { isDark, isAmoled } = useTheme();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      pressed.value,
      [0, 1],
      [
        error
          ? isDark
            ? '#F97373'
            : '#EF4444'
          : isDark
          ? (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)')
          : (Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.08)'),
        isDark ? tokens.colors.accent : tokens.colors.accent,
      ]
    );
    return { borderColor };
  }, [error, isDark, tokens]);

  const handlePressIn = () => {
    scale.value = 0.97;
    pressed.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = 1;
    pressed.value = withSpring(0, SPRING_CONFIG);
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  // Get teret color or fallback
  const teretColor = selectedTeret?.color
    ? `#${selectedTeret.color.replace('#', '')}`
    : isDark
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.2)';

  const isSelected = selectedTeret !== null;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        isSelected
          ? `Selected: ${selectedTeret.parent_category?.name} › ${selectedTeret.name}. Tap to change.`
          : 'Choose a Teret to post in'
      }
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
          animatedBorderStyle,
          {
            backgroundColor: isDark
              ? (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.06)')
              : (Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.03)'),
            shadowColor: Platform.OS === 'ios' 
              ? (error ? '#EF4444' : isDark ? tokens.colors.accent : '#000')
              : 'transparent',
            shadowOpacity: Platform.OS === 'ios' ? (error ? 0.3 : isSelected ? 0.15 : 0.08) : 0,
          },
          disabled && styles.disabled,
        ]}
      >
        {/* Color indicator dot */}
        <Animated.View
          style={[
            styles.colorDot,
            {
              backgroundColor: teretColor,
              shadowColor: teretColor,
              shadowOpacity: 0.5,
              shadowRadius: 4,
            },
          ]}
        />

        {/* Text content */}
        <View style={styles.textContainer}>
          {isSelected ? (
            <>
              <Text
                style={[
                  styles.hubText,
                  { color: isDark ? '#9CA3AF' : '#6B7280' },
                ]}
                numberOfLines={1}
              >
                {selectedTeret.parent_category?.name || 'Hub'}
              </Text>
              <CaretRight
                size={12}
                color={isDark ? '#6B7280' : '#9CA3AF'}
                weight="bold"
                style={styles.breadcrumbArrow}
              />
              <Text
                style={[
                  styles.teretText,
                  { color: isDark ? '#F5F5F7' : '#111111' },
                ]}
                numberOfLines={1}
              >
                {selectedTeret.name}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.placeholderText,
                {
                  color: error
                    ? isDark
                      ? '#F97373'
                      : '#EF4444'
                    : isDark
                    ? '#9CA3AF'
                    : '#6B7280',
                },
              ]}
            >
              Choose Teret
            </Text>
          )}
        </View>

        {/* Caret */}
        <CaretDown
          size={16}
          color={isDark ? '#A1A1AA' : '#6B6B72'}
          weight="bold"
          style={styles.caret}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 6 : 12,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 14,
    borderWidth: Platform.OS === 'android' ? 0.5 : 1.5,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  disabled: {
    opacity: 0.5,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Platform.OS === 'android' ? 10 : 12,
    shadowOffset: { width: 0, height: 0 },
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubText: {
    fontSize: 14,
    fontWeight: '500',
  },
  breadcrumbArrow: {
    marginHorizontal: 4,
  },
  teretText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  caret: {
    marginLeft: 8,
  },
});

