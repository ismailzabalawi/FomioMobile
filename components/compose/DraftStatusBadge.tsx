// UI Spec: DraftStatusBadge - Premium Edition
// - Animated inline badge showing draft status
// - Smooth fade in/out transitions
// - Pulse animation while saving
// - Checkmark icon when saved
// - Subtle styling that doesn't distract from writing

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { CloudCheck, CloudArrowUp, Warning } from 'phosphor-react-native';

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

interface DraftStatusBadgeProps {
  status: DraftStatus;
  errorMessage?: string;
  showLastSaved?: boolean;
}

const SPRING_CONFIG = { damping: 15, stiffness: 200 };

export function DraftStatusBadge({
  status,
  errorMessage,
  showLastSaved = false,
}: DraftStatusBadgeProps) {
  const { isDark, isAmoled } = useTheme();
  const themeMode = useMemo(
    () => (isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light'),
    [isDark, isAmoled]
  );
  const tokens = useMemo(() => getTokens(themeMode), [themeMode]);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  // Pulse animation while saving
  useEffect(() => {
    if (status === 'saving') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withSpring(1, SPRING_CONFIG);
      pulseOpacity.value = withSpring(1, SPRING_CONFIG);
    }
  }, [status, pulseScale, pulseOpacity]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Return placeholder to maintain height when idle (prevents layout shift)
  if (status === 'idle') {
    return <View style={styles.placeholder} />;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: CloudArrowUp,
          text: 'Saving…',
          color: isDark ? '#A1A1AA' : '#6B7280',
        };
      case 'saved':
        return {
          icon: CloudCheck,
          text: 'Saved',
          color: isDark ? '#26A69A' : '#009688',
        };
      case 'error':
        return {
          icon: Warning,
          text: errorMessage || 'Save failed',
          color: isDark ? '#F97373' : '#EF4444',
        };
      default:
        return {
          icon: CloudCheck,
          text: '',
          color: isDark ? '#A1A1AA' : '#6B7280',
        };
    }
  };

  const { icon: Icon, text, color } = getStatusConfig();

  return (
    <Animated.View
      entering={FadeIn.springify().damping(18)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor:
            status === 'error'
              ? isDark
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(239, 68, 68, 0.1)'
              : 'transparent',
        },
      ]}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Icon size={14} color={color} weight="regular" />
      </Animated.View>
      <Text
        style={[
          styles.text,
          { color },
          status === 'error' && styles.errorText,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 26,
  },
  placeholder: {
    minHeight: 26,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontWeight: '600',
  },
});

