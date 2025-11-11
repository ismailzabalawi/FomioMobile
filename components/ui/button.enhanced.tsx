import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
  Animated,
  Pressable,
} from 'react-native';
import { useTheme } from '@/components/theme';
import { 
  typography, 
  spacing, 
  borderRadius, 
  animation, 
  components,
  getThemeColors,
  createTextStyle,
  createShadowStyle,
} from '@/shared/design-system';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  hapticFeedback?: boolean;
}

/**
 * Enhanced Button Component
 * 
 * Features:
 * - Design system integration
 * - Micro-interactions with scale animation
 * - Multiple variants and sizes
 * - Loading states with spinner
 * - Icon support
 * - Enhanced accessibility
 * - Haptic feedback ready
 * - Full width option
 */
export function ButtonEnhanced({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  hapticFeedback = true,
}: ButtonProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Handle press with micro-interaction
  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: animation.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animation.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);
  
  const handlePress = useCallback(() => {
    if (!disabled && !loading && onPress) {
      // TODO: Add haptic feedback here when available
      // if (hapticFeedback) {
      //   HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
      // }
      onPress();
    }
  }, [disabled, loading, onPress, hapticFeedback]);
  
  // Get variant styles
  const getVariantStyles = () => {
    const baseStyles = {
      primary: {
        backgroundColor: colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: colors.surfaceVariant,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      destructive: {
        backgroundColor: colors.error,
        borderWidth: 0,
      },
    };
    
    return baseStyles[variant];
  };
  
  // Get text color based on variant
  const getTextColor = () => {
    const textColors = {
      primary: colors.textInverse,
      secondary: colors.text,
      outline: colors.text,
      ghost: colors.text,
      destructive: colors.textInverse,
    };
    
    return textColors[variant];
  };
  
  // Get size styles
  const getSizeStyles = () => {
    const sizeStyles = {
      sm: {
        height: components.button.height.sm,
        paddingHorizontal: components.button.padding.sm.horizontal,
        paddingVertical: components.button.padding.sm.vertical,
      },
      md: {
        height: components.button.height.md,
        paddingHorizontal: components.button.padding.md.horizontal,
        paddingVertical: components.button.padding.md.vertical,
      },
      lg: {
        height: components.button.height.lg,
        paddingHorizontal: components.button.padding.lg.horizontal,
        paddingVertical: components.button.padding.lg.vertical,
      },
    };
    
    return sizeStyles[size];
  };
  
  // Get text size based on button size
  const getTextSize = () => {
    const textSizes = {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    };
    
    return textSizes[size];
  };
  
  // Dynamic styles
  const buttonStyle: StyleProp<ViewStyle> = [
    styles.base,
    getVariantStyles(),
    getSizeStyles(),
    {
      borderRadius: components.button.borderRadius,
      opacity: disabled ? 0.6 : 1,
      ...(variant === 'primary' && !disabled && createShadowStyle('sm', isDark)),
      ...(fullWidth && { width: '100%' }),
    },
    style,
  ];
  
  const buttonTextStyle: StyleProp<TextStyle> = [
    createTextStyle('bodyMedium', getTextColor()),
    {
      fontSize: getTextSize(),
      textAlign: 'center',
    },
    textStyle,
  ];
  
  const spinnerColor = variant === 'primary' || variant === 'destructive' 
    ? colors.textInverse 
    : colors.primary;
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={buttonStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessible
        accessibilityRole="button"
        accessibilityState={{ 
          disabled: disabled || loading,
          busy: loading,
        }}
        accessibilityLabel={typeof children === 'string' ? children : 'Button'}
      >
        <View style={styles.content}>
          {/* Left Icon */}
          {icon && iconPosition === 'left' && !loading && (
            <View style={[styles.icon, styles.iconLeft]}>
              {icon}
            </View>
          )}
          
          {/* Loading Spinner */}
          {loading && (
            <ActivityIndicator
              size="small"
              color={spinnerColor}
              style={[
                styles.spinner, 
                ...(icon ? [styles.spinnerWithIcon] : [])
              ]}
            />
          )}
          
          {/* Button Text */}
          <Text style={buttonTextStyle} numberOfLines={1}>
            {children}
          </Text>
          
          {/* Right Icon */}
          {icon && iconPosition === 'right' && !loading && (
            <View style={[styles.icon, styles.iconRight]}>
              {icon}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: components.touchTarget.minSize,
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  iconLeft: {
    marginRight: spacing.sm,
  },
  
  iconRight: {
    marginLeft: spacing.sm,
  },
  
  spinner: {
    marginRight: spacing.sm,
  },
  
  spinnerWithIcon: {
    marginRight: spacing.xs,
  },
});

// Export with display name for debugging
ButtonEnhanced.displayName = 'ButtonEnhanced';

