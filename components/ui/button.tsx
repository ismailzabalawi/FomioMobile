// UI Spec: Button
// - Uses Fomio semantic tokens: bg-fomio-primary, text-fomio-foreground
// - Supports dark: variants for AMOLED Dark mode
// - Variants: default, destructive, outline, secondary, ghost, link
// - Sizes: default, sm, lg, icon
// - Touch-safe targets (min 44px height per design rules)

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'default',
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const getVariantClasses = () => {
    const variantClasses = {
      default: 'bg-fomio-primary dark:bg-fomio-primary-dark',
      destructive: 'bg-fomio-danger dark:bg-fomio-danger-dark',
      outline: 'bg-transparent border border-fomio-border-soft dark:border-fomio-border-soft-dark',
      secondary: 'bg-fomio-card dark:bg-fomio-card-dark border border-fomio-border-soft dark:border-fomio-border-soft-dark',
      ghost: 'bg-transparent',
      link: 'bg-transparent',
    };
    return variantClasses[variant];
  };

  const getSizeClasses = () => {
    const sizeClasses = {
      default: 'h-11 px-4',
      sm: 'h-9 px-3',
      lg: 'h-12 px-5',
      icon: 'w-11 h-11 p-0',
    };
    return sizeClasses[size];
  };

  const getTextVariantClasses = () => {
    const textVariantClasses = {
      default: 'text-white',
      destructive: 'text-white',
      outline: 'text-fomio-foreground dark:text-fomio-foreground-dark',
      secondary: 'text-fomio-foreground dark:text-fomio-foreground-dark',
      ghost: 'text-fomio-primary dark:text-fomio-primary-dark',
      link: 'text-fomio-primary dark:text-fomio-primary-dark underline',
    };
    return textVariantClasses[variant];
  };

  const getTextSizeClasses = () => {
    const textSizeClasses = {
      default: 'text-body',
      sm: 'text-caption',
      lg: 'text-subtitle',
      icon: 'text-body',
    };
    return textSizeClasses[size];
  };

  const getLoadingIndicatorColor = () => {
    if (variant === 'default' || variant === 'destructive') {
      return '#ffffff';
    }
    return '#009688'; // fomio-primary (teal)
  };

  const buttonClasses = cn(
    'rounded-fomio-pill items-center justify-center flex-row',
    getVariantClasses(),
    getSizeClasses(),
    disabled && 'opacity-50'
  );

  const textClasses = cn(
    'font-semibold text-center',
    getTextVariantClasses(),
    getTextSizeClasses(),
    disabled && 'opacity-50'
  );

  return (
    <TouchableOpacity
      testID={testID ?? 'button-touchable'}
      className={buttonClasses}
      style={style}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      <View className="flex-row items-center justify-center">
        {loading && (
          <View className="mr-2">
            <ActivityIndicator
              testID="button-loading-indicator"
              size="small"
              color={getLoadingIndicatorColor()}
            />
          </View>
        )}
        <Text className={textClasses} style={textStyle}>
          {children}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
