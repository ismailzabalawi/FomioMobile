import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { getTokens } from '../design/tokens';

type Props = ViewProps & {
  mode?: 'light' | 'dark';
  style?: ViewStyle;
  children: React.ReactNode;
};

export function FluidSection({ mode = 'dark', style, children, ...rest }: Props) {
  const tokens = getTokens(mode);
  const backgroundColor =
    mode === 'dark' ? 'rgba(5,7,11,0.92)' : tokens.colors.surfaceFrost;
  const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.08)' : tokens.colors.border;

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor,
          borderColor,
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
