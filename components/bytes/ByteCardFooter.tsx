import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Heart, ChatCircle, BookmarkSimple, Share } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import type { Byte } from '@/types/byte';

const MIN_TOUCH_TARGET = 44;

/**
 * ByteCardFooter - Interaction actions bar
 * 
 * UI Spec:
 * - Twitter-like: like, comment, bookmark, share
 * - Icons: 20px, Phosphor icons
 * - Counts: shown if > 0
 * - Spacing: gap-6 between actions, mt-3 from content/media
 * - Touch targets: min 44px (accessibility)
 */
export function ByteCardFooter({ byte }: { byte: Byte }) {
  const { themeMode, isAmoled } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // TODO: Implement like action
    console.log('Like:', byte.id);
  }, [byte.id]);

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // TODO: Navigate to comments or open comment sheet
    console.log('Comment:', byte.id);
  }, [byte.id]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // TODO: Implement bookmark action
    console.log('Bookmark:', byte.id);
  }, [byte.id]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // TODO: Implement share action
    console.log('Share:', byte.id);
  }, [byte.id]);

  return (
    <View className="flex-row items-center gap-6 mt-3 mb-3">
      <FooterButton
        icon={<Heart size={20} weight="regular" color={colors.comment} />}
        count={byte.stats.likes}
        onPress={handleLike}
        label="Like"
      />
      <FooterButton
        icon={<ChatCircle size={20} weight="regular" color={colors.comment} />}
        count={byte.stats.replies}
        onPress={handleComment}
        label="Comment"
      />
      <FooterButton
        icon={<BookmarkSimple size={20} weight="regular" color={colors.comment} />}
        onPress={handleBookmark}
        label="Bookmark"
      />
      <FooterButton
        icon={<Share size={20} weight="regular" color={colors.comment} />}
        onPress={handleShare}
        label="Share"
      />
    </View>
  );
}

interface FooterButtonProps {
  icon: React.ReactNode;
  count?: number;
  onPress: () => void;
  label: string;
}

function FooterButton({ icon, count, onPress, label }: FooterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 min-h-11 justify-center"
      style={{ minHeight: MIN_TOUCH_TARGET }}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${count !== undefined && count > 0 ? `, ${count}` : ''}`}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <Text className="text-caption font-medium text-fomio-muted dark:text-fomio-muted-dark">
          {count}
        </Text>
      )}
    </Pressable>
  );
}

