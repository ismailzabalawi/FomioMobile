// UI Spec: FloatingToolbar - Premium Edition
// - Appears above text selection or at cursor position
// - Smooth fade-in with spring scale animation
// - Glass-morphism background with blur
// - Quick formatting actions with haptic feedback
// - Dismisses on scroll or tap outside

import React, { useMemo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import {
  TextB,
  TextItalic,
  LinkSimple,
  Code,
  Quotes,
  ListBullets,
  Hash,
} from 'phosphor-react-native';

type FormatAction =
  | 'bold'
  | 'italic'
  | 'link'
  | 'code'
  | 'quote'
  | 'list'
  | 'heading';

interface FloatingToolbarProps {
  visible: boolean;
  position?: { x: number; y: number };
  onAction: (action: FormatAction) => void;
  onDismiss?: () => void;
}

const TOOLBAR_ACTIONS: Array<{
  action: FormatAction;
  icon: typeof TextB;
  label: string;
}> = [
  { action: 'bold', icon: TextB, label: 'Bold' },
  { action: 'italic', icon: TextItalic, label: 'Italic' },
  { action: 'link', icon: LinkSimple, label: 'Link' },
  { action: 'code', icon: Code, label: 'Code' },
  { action: 'quote', icon: Quotes, label: 'Quote' },
  { action: 'list', icon: ListBullets, label: 'List' },
  { action: 'heading', icon: Hash, label: 'Heading' },
];

const SPRING_CONFIG = { damping: 16, stiffness: 260 };

function ToolbarButton({
  icon: Icon,
  label,
  isDark,
  onPress,
}: {
  icon: typeof TextB;
  label: string;
  isDark: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.88;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.button}
    >
      <Animated.View style={[styles.buttonInner, animatedStyle]}>
        <Icon
          size={20}
          color={isDark ? '#FFFFFF' : '#1A1A1A'}
          weight="regular"
        />
      </Animated.View>
    </Pressable>
  );
}

export function FloatingToolbar({
  visible,
  position,
  onAction,
  onDismiss,
}: FloatingToolbarProps) {
  const { isDark, isAmoled } = useTheme();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const handleAction = useCallback(
    (action: FormatAction) => {
      onAction(action);
      onDismiss?.();
    },
    [onAction, onDismiss]
  );

  if (!visible) return null;

  const toolbarContent = (
    <View style={styles.toolbarContent}>
      {TOOLBAR_ACTIONS.map((item, index) => (
        <React.Fragment key={item.action}>
          <ToolbarButton
            icon={item.icon}
            label={item.label}
            isDark={isDark}
            onPress={() => handleAction(item.action)}
          />
          {index < TOOLBAR_ACTIONS.length - 1 && (
            <View
              style={[
                styles.separator,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(18).stiffness(220)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.container,
        position && {
          position: 'absolute',
          top: position.y - 50,
          left: Math.max(16, position.x - 140),
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 60 : 40}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.blurContainer,
            {
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {toolbarContent}
        </BlurView>
      ) : (
        <View
          style={[
            styles.androidContainer,
            {
              backgroundColor: isDark
                ? 'rgba(28, 28, 30, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.06)',
              shadowColor: isDark ? tokens.colors.accent : '#000',
            },
          ]}
        >
          {toolbarContent}
        </View>
      )}
      
      {/* Arrow pointer */}
      <View
        style={[
          styles.arrow,
          {
            borderTopColor: isDark
              ? 'rgba(28, 28, 30, 0.98)'
              : 'rgba(255, 255, 255, 0.98)',
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    zIndex: 1000,
  },
  blurContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  androidContainer: {
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

