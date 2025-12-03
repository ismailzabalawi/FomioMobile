// UI Spec: ToastStackItem
// - Renders individual toast notification with proper stacking
// - Creates a custom toast UI that matches ToastNotificationComponent
// - Handles proper positioning for stacking

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/components/theme';
import { getThemeColors, createTextStyle, spacing, animation } from '@/shared/design-system';
import { ToastNotification } from '@/shared/form-validation';

interface ToastStackItemProps {
  toast: ToastNotification;
  index: number;
  onDismiss: (id: string) => void;
}

// Approximate toast height including padding
const TOAST_HEIGHT = 80;
const TOAST_SPACING = 8;

export function ToastStackItem({ toast, index, onDismiss }: ToastStackItemProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    // Slide in animation
    translateY.value = withTiming(0, { duration: animation.duration.normal });
    opacity.value = withTiming(1, { duration: animation.duration.normal });
  }, [translateY, opacity]);
  
  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: animation.duration.fast });
    opacity.value = withTiming(0, { duration: animation.duration.fast }, () => {
      onDismiss(toast.id);
    });
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
  
  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return { background: colors.success || '#10B981', text: '#FFFFFF' };
      case 'error':
        return { background: colors.error, text: '#FFFFFF' };
      case 'warning':
        return { background: colors.warning || '#F59E0B', text: '#FFFFFF' };
      case 'info':
        return { background: colors.primary, text: '#FFFFFF' };
      default:
        return { background: colors.surface, text: colors.text };
    }
  };
  
  const toastColors = getToastColors();
  
  // Calculate top offset for stacking
  const topOffset = index * (TOAST_HEIGHT + TOAST_SPACING);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastColors.background,
          top: topOffset,
        },
        animatedStyle,
      ]}
      pointerEvents="auto"
    >
      <View style={styles.toastContent}>
        <View style={styles.toastText}>
          <Text style={[
            createTextStyle('headline', toastColors.text),
            styles.toastTitle,
          ]}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[
              createTextStyle('body', toastColors.text),
              styles.toastMessage,
            ]}>
              {toast.message}
            </Text>
          )}
        </View>
        
        {toast.action && (
          <TouchableOpacity
            style={styles.toastAction}
            onPress={toast.action.onPress}
            accessibilityLabel={toast.action.label}
          >
            <Text style={[
              createTextStyle('label', toastColors.text),
              styles.toastActionText,
            ]}>
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {!toast.persistent && (
        <TouchableOpacity
          style={styles.toastDismiss}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss notification"
        >
          <Text style={[styles.toastDismissText, { color: toastColors.text }]}>
            ×
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastText: {
    flex: 1,
  },
  toastTitle: {
    fontWeight: '600',
  },
  toastMessage: {
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  toastAction: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  toastActionText: {
    fontWeight: '600',
  },
  toastDismiss: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastDismissText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

