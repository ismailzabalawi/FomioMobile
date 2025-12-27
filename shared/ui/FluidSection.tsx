import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { getTokens } from '../design/tokens';

type Props = ViewProps & {
  mode?: 'light' | 'dark' | 'darkAmoled';
  style?: ViewStyle;
  children: React.ReactNode;
};

export function FluidSection({ mode = 'dark', style, children, ...rest }: Props) {
  const tokens = getTokens(mode);
  const backgroundColor = tokens.colors.surfaceFrost;
  const borderColor = tokens.colors.border;

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
