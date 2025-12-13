import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getTokens } from '../design/tokens';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  mode?: 'light' | 'dark';
  style?: ViewStyle;
};

export function FluidChip({ label, selected = false, onPress, mode = 'dark', style }: Props) {
  const tokens = useMemo(() => getTokens(mode), [mode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.02 : 1, tokens.motion.snapSpring) }],
  }), [selected, tokens.motion.snapSpring]);

  const bg = selected ? tokens.colors.accentSoft : tokens.colors.surfaceMuted;
  const border = selected ? tokens.colors.accent : tokens.colors.border;
  const textColor = selected ? tokens.colors.accent : tokens.colors.text;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
          shadowColor: tokens.colors.shadow,
        },
        tokens.shadows.soft,
        style,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
});
