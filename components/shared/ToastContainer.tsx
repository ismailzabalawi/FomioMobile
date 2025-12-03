// UI Spec: ToastContainer
// - Global container for toast notifications
// - Positioned below header (accounts for safe area + header height)
// - Stacks toasts vertically with spacing
// - Uses useToast hook to subscribe to toast state
// - Renders multiple ToastNotificationComponent instances with proper stacking
// - Handles z-index and pointer events correctly

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/shared/form-validation';
import { useHeader } from '@/components/ui/header';
import { ToastStackItem } from './ToastStackItem';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  const insets = useSafeAreaInsets();
  const { header } = useHeader();

  // Calculate header height - same logic as RootLayoutContent
  const BASE_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 44;
  const HEADER_PADDING = Platform.OS === 'ios' ? 4 : 2;
  const baseHeaderHeight = BASE_BAR_HEIGHT + HEADER_PADDING;
  const measuredHeaderHeight = header.headerHeight ?? baseHeaderHeight;

  // When extendToStatusBar is true, header extends into status bar area
  const headerTop = header.extendToStatusBar ? 0 : insets.top;
  const contentPaddingTop = header.extendToStatusBar && measuredHeaderHeight > baseHeaderHeight
    ? measuredHeaderHeight - insets.top
    : measuredHeaderHeight + headerTop;

  // Position toasts below header with small gap
  const toastTop = contentPaddingTop + 8;

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          top: toastTop,
        },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast, index) => (
        <ToastStackItem
          key={toast.id}
          toast={toast}
          index={index}
          onDismiss={dismissToast}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999, // Below header (1000) but above all content
    paddingHorizontal: 16,
    pointerEvents: 'box-none', // Allow touches to pass through to content below
  },
});

