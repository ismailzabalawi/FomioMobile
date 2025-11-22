import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Heart, ChatCircle, BookmarkSimple, Share } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { useByteCardActions } from './useByteCardActions';
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
  
  const {
    isLiked,
    isBookmarked,
    likeCount,
    replyCount,
    loadingLike,
    loadingBookmark,
    toggleLike,
    toggleBookmark,
    onCommentPress,
    onSharePress,
  } = useByteCardActions(byte);

  return (
    <View className="flex-row items-center gap-6 mt-3 mb-3">
      <FooterButton
        icon={
          <Heart 
            size={20} 
            weight={isLiked ? "fill" : "regular"} 
            color={isLiked ? colors.like : colors.comment} 
          />
        }
        count={likeCount}
        onPress={toggleLike}
        label="Like"
        loading={loadingLike}
      />
      <FooterButton
        icon={<ChatCircle size={20} weight="regular" color={colors.comment} />}
        count={replyCount}
        onPress={onCommentPress}
        label="Comment"
      />
      <FooterButton
        icon={
          <BookmarkSimple 
            size={20} 
            weight={isBookmarked ? "fill" : "regular"} 
            color={isBookmarked ? colors.bookmark : colors.comment} 
          />
        }
        onPress={toggleBookmark}
        label="Bookmark"
        loading={loadingBookmark}
      />
      <FooterButton
        icon={<Share size={20} weight="regular" color={colors.comment} />}
        onPress={onSharePress}
        label="Share"
      />
    </View>
  );
}

interface FooterButtonProps {
  icon: React.ReactNode;
  count?: number;
  onPress: () => void | Promise<void>;
  label: string;
  loading?: boolean;
}

function FooterButton({ icon, count, onPress, label, loading }: FooterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="flex-row items-center gap-1 min-h-11 justify-center"
      style={{ 
        minHeight: MIN_TOUCH_TARGET,
        opacity: loading ? 0.6 : 1,
      }}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${count !== undefined && count > 0 ? `, ${count}` : ''}`}
      accessibilityState={{ disabled: loading }}
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

