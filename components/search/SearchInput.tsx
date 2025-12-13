import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { getTokens } from '@/shared/design/tokens';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

/**
 * SearchInput - Consistent search input component with focus animations
 * 
 * UI Spec:
 * - Uses semantic theme tokens from getThemeColors
 * - Consistent styling across all states
 * - AMOLED dark mode support with true black baseline
 * - Search icon on the left with color transition on focus
 * - Subtle scale animation on focus
 * - Proper theme-aware background and text colors
 */
export function SearchInput({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = 'Search topics, categories, or users...',
  accessibilityLabel = 'Search input',
}: SearchInputProps) {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);
  
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withSpring(1, tokens.motion.liquidSpring);
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withSpring(0, tokens.motion.liquidSpring);
  };

  // Animated container style with subtle scale on focus
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(focusProgress.value === 1 ? 1.01 : 1, tokens.motion.snapSpring) }],
    };
  }, [tokens.motion.snapSpring]);

  // Icon color transitions from secondary to accent on focus
  const iconColor = isFocused ? colors.accent : colors.secondary;

  return (
    <Animated.View 
      className="flex-row items-center mx-4 my-4 px-4 py-3 rounded-xl"
      style={[
        {
          backgroundColor: tokens.colors.surfaceFrost,
          borderWidth: 1,
          borderColor: isFocused ? colors.accent : tokens.colors.border,
          borderRadius: tokens.radii.lg,
        },
        tokens.shadows.soft,
        containerAnimatedStyle,
      ]}
    >
      <MagnifyingGlass 
        size={20} 
        color={iconColor} 
        weight={isFocused ? 'bold' : 'regular'} 
      />
      <Input
        style={{ 
          flex: 1, 
          marginLeft: 12,
          backgroundColor: 'transparent',
          borderWidth: 0,
        }}
        inputStyle={{ 
          fontSize: 16, 
          color: colors.foreground 
        }}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
}
