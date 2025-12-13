import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { getTokens } from '../design/tokens';

type Props = {
  mode?: 'light' | 'dark';
  style?: ViewStyle;
  children: React.ReactNode;
};

export function FluidSection({ mode = 'dark', style, children }: Props) {
  const tokens = getTokens(mode);
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: tokens.colors.surfaceFrost,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radii.lg,
          shadowColor: tokens.colors.shadow,
        },
        tokens.shadows.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 16,
    borderWidth: 1,
  },
});
