import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/components/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { isDark } = useTheme();

  const getVariantStyle = () => {
    const baseStyle = {
      backgroundColor: isDark ? '#374151' : '#ffffff',
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          shadowColor: isDark ? '#000000' : '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: isDark ? '#4b5563' : '#e5e7eb',
        };
      default:
        return baseStyle;
    }
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    getVariantStyle(),
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function CardTitle({ children, style }: CardTitleProps) {
  const { isDark } = useTheme();
  return (
    <Text style={[styles.title, { color: isDark ? '#f9fafb' : '#111827' }, style]}>
      {children}
    </Text>
  );
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  const { isDark } = useTheme();
  return (
    <Text style={[styles.description, { color: isDark ? '#d1d5db' : '#6b7280' }, style]}>
      {children}
    </Text>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

