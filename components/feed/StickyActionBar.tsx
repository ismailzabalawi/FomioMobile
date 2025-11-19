import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, ChatCircle, BookmarkSimple, Share, DotsThreeVertical } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import * as Haptics from 'expo-haptics';

export interface StickyActionBarProps {
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  replyCount: number;
  onLike: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onOverflow?: () => void;
}

// UI Spec: StickyActionBar — Sticky action bar that stays above keyboard
// - Component that renders action buttons: Like, Comment, Bookmark, Share, Overflow
// - Uses KeyboardAvoidingView with behavior based on platform
// - Positions above keyboard when keyboard is open
// - Stays visible when scrolling
// - Uses Fomio theme tokens for styling
// - Shows current state (liked, bookmarked) with filled icons
export function StickyActionBar({
  isLiked,
  isBookmarked,
  likeCount,
  replyCount,
  onLike,
  onComment,
  onBookmark,
  onShare,
  onOverflow,
}: StickyActionBarProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onLike();
  };

  const handleComment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onComment();
  };

  const handleBookmark = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onBookmark();
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onShare();
  };

  const backgroundColor = isAmoled ? '#000000' : (isDark ? colors.card : '#ffffff');
  const borderColor = colors.border;
  const iconColor = colors.foreground;

  return (
    <View
      className="flex-row items-center justify-around border-t px-4 py-3"
      style={{
        backgroundColor,
        borderTopColor: borderColor,
        borderTopWidth: 1,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={handleLike}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={24}
            weight={isLiked ? 'fill' : 'regular'}
            color={isLiked ? (isDark ? '#ef4444' : '#dc2626') : iconColor}
          />
          <Text
            className="text-xs mt-1 font-medium"
            style={{ color: iconColor }}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={handleComment}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <ChatCircle
            size={24}
            weight="regular"
            color={iconColor}
          />
          <Text
            className="text-xs mt-1 font-medium"
            style={{ color: iconColor }}
          >
            {replyCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={handleBookmark}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <BookmarkSimple
            size={24}
            weight={isBookmarked ? 'fill' : 'regular'}
            color={isBookmarked ? (isDark ? '#fbbf24' : '#f59e0b') : iconColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={handleShare}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Share
            size={24}
            weight="regular"
            color={iconColor}
          />
        </TouchableOpacity>

        {onOverflow && (
          <TouchableOpacity
            className="flex-1 items-center py-2"
            onPress={onOverflow}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <DotsThreeVertical
              size={24}
              weight="regular"
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
  );
}

