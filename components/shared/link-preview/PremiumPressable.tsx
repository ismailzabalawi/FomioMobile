/**
 * PremiumPressable - Animated pressable with haptic feedback
 * 
 * Provides premium micro-interactions:
 * - Scale animation on press (0.98)
 * - Haptic feedback via expo-haptics
 * - Spring animation for smooth feel
 */

import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PremiumPressableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Premium pressable component with scale animation and haptic feedback
 */
export function PremiumPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PremiumPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(scale.value, {
          damping: 15,
          stiffness: 300,
        }),
      },
    ],
  }));

  const handlePressIn = (event: any) => {
    scale.value = 0.98;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors (not available on all devices)
    });
    
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = 1;
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      {children}
    </AnimatedPressable>
  );
}

