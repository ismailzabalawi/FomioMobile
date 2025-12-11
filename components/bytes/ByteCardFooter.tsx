import React, { memo, useMemo } from 'react';
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
function ByteCardFooterComponent({ byte }: { byte: Byte }) {
  const { themeMode, isAmoled } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  
  // Debug logging - disabled by default to prevent performance issues
  // Enable by setting ENABLE_FOOTER_DEBUG = true
  const ENABLE_FOOTER_DEBUG = __DEV__ && false; // Set to true to enable debug logging
  if (ENABLE_FOOTER_DEBUG) {
    console.log('🔍 [ByteCardFooter] Rendering badges:', {
      byteId: byte.id,
      hasHub: !!byte.hub,
      hubName: byte.hub?.name,
      hubColor: byte.hub?.color,
      hasTeret: !!byte.teret,
      teretName: byte.teret?.name,
      teretColor: byte.teret?.color,
      willRender: !!(byte.hub || byte.teret),
    });
  }
  
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

  const likeIcon = useMemo(() => (
    <Heart 
      size={20} 
      weight={isLiked ? "fill" : "regular"} 
      color={isLiked ? colors.like : colors.comment} 
    />
  ), [isLiked, colors.like, colors.comment]);

  const bookmarkIcon = useMemo(() => (
    <BookmarkSimple 
      size={20} 
      weight={isBookmarked ? "fill" : "regular"} 
      color={isBookmarked ? colors.bookmark : colors.comment} 
    />
  ), [isBookmarked, colors.bookmark, colors.comment]);

  const commentIcon = useMemo(() => (
    <ChatCircle size={20} weight="regular" color={colors.comment} />
  ), [colors.comment]);

  const shareIcon = useMemo(() => (
    <Share size={20} weight="regular" color={colors.comment} />
  ), [colors.comment]);

  return (
    <View
      className="mt-4 mb-2"
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
      }}
    >
      <View className="flex-row items-center justify-between">
        <FooterButton
          icon={likeIcon}
          count={likeCount}
          onPress={toggleLike}
          label="Like"
          loading={loadingLike}
          active={isLiked}
          tint={colors.like}
        />
        <FooterButton
          icon={commentIcon}
          count={replyCount}
          onPress={onCommentPress}
          label="Comment"
          tint={colors.comment}
        />
        <FooterButton
          icon={bookmarkIcon}
          onPress={toggleBookmark}
          label="Bookmark"
          loading={loadingBookmark}
          active={isBookmarked}
          tint={colors.bookmark}
        />
        <FooterButton
          icon={shareIcon}
          onPress={onSharePress}
          label="Share"
          tint={colors.comment}
        />
      </View>
    </View>
  );
}

interface FooterButtonProps {
  icon: React.ReactNode;
  count?: number;
  onPress: () => void | Promise<void>;
  label: string;
  loading?: boolean;
  active?: boolean;
  tint?: string;
}

function FooterButton({ icon, count, onPress, label, loading, active, tint }: FooterButtonProps) {
  const showCount = typeof count === 'number';
  const displayCount = showCount ? count : undefined;
  const backgroundColor = active && tint ? `${tint}1A` : undefined;
  const rippleColor = tint ? `${tint}1A` : 'rgba(0,0,0,0.06)';

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="flex-1 flex-row items-center gap-1 min-h-11 justify-center px-2 rounded-full"
      style={{ 
        minHeight: MIN_TOUCH_TARGET,
        opacity: loading ? 0.6 : 1,
        backgroundColor,
      }}
      hitSlop={8}
      android_ripple={{ color: rippleColor, borderless: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${showCount ? `, ${displayCount}` : ''}`}
      accessibilityState={{ disabled: loading }}
    >
      {icon}
      {showCount && (
        <Text className="text-caption font-medium text-fomio-muted dark:text-fomio-muted-dark">
          {displayCount}
        </Text>
      )}
    </Pressable>
  );
}

export const ByteCardFooter = memo(ByteCardFooterComponent, (prev, next) => {
  return prev.byte.id === next.byte.id;
});
ByteCardFooter.displayName = 'ByteCardFooter';
