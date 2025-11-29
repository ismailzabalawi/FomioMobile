import React from 'react';
import { Pressable, Share, Alert, Platform } from 'react-native';
import { Share as ShareIcon } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import * as Haptics from 'expo-haptics';

// Accessibility: Larger hitSlop for better touch targets
const DEFAULT_HIT_SLOP = Platform.OS === 'ios' ? 16 : 20;

export interface ShareButtonProps {
  title: string;
  url: string;
  onPress?: () => void;
}

// UI Spec: ShareButton — Simple button component with Share icon
// - Uses Share icon from phosphor-react-native
// - Handles share action with haptic feedback
// - Themed with Fomio semantic tokens
export function ShareButton({ title, url, onPress }: ShareButtonProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handlePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Share.share({
        message: title,
        url: url,
      });
      onPress?.();
    } catch (error) {
      // User cancelled or error occurred
      if ((error as any)?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={DEFAULT_HIT_SLOP}
      className="p-2 rounded-full active:opacity-70"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Share"
      accessibilityHint={`Share ${title}`}
      testID="header-share-button"
    >
      <ShareIcon size={20} color={colors.foreground} weight="bold" />
    </Pressable>
  );
}

