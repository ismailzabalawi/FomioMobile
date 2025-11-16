// UI Spec: Card
// - Uses Fomio semantic tokens: bg-fomio-card, border-fomio-border-soft
// - Supports dark: variants for AMOLED Dark mode
// - Variants: default, elevated, outlined
// - Border radius: rounded-fomio-card (18px)
// - Subcomponents: CardHeader, CardTitle, CardDescription, CardContent, CardFooter

import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { cn } from '@/lib/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const getVariantClasses = () => {
    const baseClasses = 'bg-fomio-card dark:bg-fomio-card-dark';
    
    switch (variant) {
      case 'elevated':
        return cn(baseClasses, 'shadow-lg');
      case 'outlined':
        return cn(baseClasses, 'border border-fomio-border-soft dark:border-fomio-border-soft-dark');
      default:
        return baseClasses;
    }
  };

  const cardClasses = cn(
    'rounded-fomio-card overflow-hidden',
    getVariantClasses()
  );

  // For elevated variant, we need to add shadow styles via style prop
  // NativeWind shadow utilities may not work perfectly on all platforms
  const shadowStyle = variant === 'elevated' ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } : undefined;

  return (
    <View className={cardClasses} style={[shadowStyle, style]}>
      {children}
    </View>
  );
}

// UI Spec: CardHeader
// - Padding: px-4 (16px horizontal), pt-4 pb-2 (16px top, 8px bottom)
export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View className="px-4 pt-4 pb-2" style={style}>
      {children}
    </View>
  );
}

// UI Spec: CardTitle
// - Uses Fomio typography: text-title
// - Uses Fomio semantic tokens: text-fomio-foreground
// - Font weight: semibold
export interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function CardTitle({ children, style }: CardTitleProps) {
  return (
    <Text className="text-title font-semibold text-fomio-foreground dark:text-fomio-foreground-dark mb-1" style={style}>
      {children}
    </Text>
  );
}

// UI Spec: CardDescription
// - Uses Fomio typography: text-body
// - Uses Fomio semantic tokens: text-fomio-muted
export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  return (
    <Text className="text-body text-fomio-muted dark:text-fomio-muted-dark" style={style}>
      {children}
    </Text>
  );
}

// UI Spec: CardContent
// - Padding: px-4 py-2 (16px horizontal, 8px vertical)
export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View className="px-4 py-2" style={style}>
      {children}
    </View>
  );
}

// UI Spec: CardFooter
// - Padding: px-4 pt-2 pb-4 (16px horizontal, 8px top, 16px bottom)
// - Layout: flex-row items-center justify-between
export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return (
    <View className="px-4 pt-2 pb-4 flex-row items-center justify-between" style={style}>
      {children}
    </View>
  );
}
