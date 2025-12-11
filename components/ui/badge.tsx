import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/components/theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const { isDark } = useTheme();

  const getVariantStyle = () => {
    const baseStyles = {
      default: {
        backgroundColor: '#009688',
      },
      secondary: {
        backgroundColor: isDark ? '#374151' : '#f1f5f9',
      },
      destructive: {
        backgroundColor: '#ef4444',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: isDark ? '#4b5563' : '#d1d5db',
      },
    };
    return baseStyles[variant];
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return { paddingHorizontal: 6, paddingVertical: 2, minHeight: 20 };
      case 'md': return { paddingHorizontal: 8, paddingVertical: 4, minHeight: 24 };
      case 'lg': return { paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 };
      default: return { paddingHorizontal: 8, paddingVertical: 4, minHeight: 24 };
    }
  };

  const getVariantTextStyle = () => {
    const baseTextStyles = {
      default: { color: '#ffffff' },
      secondary: { color: isDark ? '#f9fafb' : '#374151' },
      destructive: { color: '#ffffff' },
      outline: { color: isDark ? '#f9fafb' : '#374151' },
    };
    return baseTextStyles[variant];
  };

  const getSizeTextStyle = () => {
    switch (size) {
      case 'sm': return { fontSize: 11 };
      case 'md': return { fontSize: 12 };
      case 'lg': return { fontSize: 14 };
      default: return { fontSize: 12 };
    }
  };

  const badgeStyle: StyleProp<ViewStyle> = [
    styles.base,
    getVariantStyle(),
    getSizeStyle(),
    style,
  ];

  const badgeTextStyle: StyleProp<TextStyle> = [
    styles.text,
    getVariantTextStyle(),
    getSizeTextStyle(),
    textStyle,
  ];

  return (
    <View style={badgeStyle}>
      <Text style={badgeTextStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
