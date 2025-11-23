import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, ChatCircle, BookmarkSimple, Share } from 'phosphor-react-native';
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
}

/**
 * StickyActionBar — Compact, centered action bar for ByteBlogPage
 * 
 * UI Spec: StickyActionBar
 * - Evenly spaced icons across the bar (justify-between)
 * - Larger icons (26px) for better visibility
 * - Icons perfectly aligned horizontally (0° on x-axis)
 * - All icons at same vertical position regardless of counts
 * - Reduced height: py-1.5 for minimal vertical padding
 * - Counts positioned consistently below icons
 * - Uses semantic tokens: text-caption, theme colors
 * - Background matches screen (uses same semantic tokens as screen)
 * - Safe area aware padding
 */
export function StickyActionBar({
  isLiked,
  isBookmarked,
  likeCount,
  replyCount,
  onLike,
  onComment,
  onBookmark,
  onShare,
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

  const borderColor = colors.border;
  const iconColor = colors.foreground;
  const likedColor = isDark ? '#ef4444' : '#dc2626';
  const bookmarkedColor = isDark ? '#fbbf24' : '#f59e0b';

  return (
    <View
      className={`border-t ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}
      style={{
        borderTopColor: borderColor,
        borderTopWidth: 1,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <View
        className="flex-row items-start justify-between px-6 py-1.5"
        style={{ maxWidth: 600, alignSelf: 'center', width: '100%' }}
      >
        {/* Like */}
        <TouchableOpacity
          className="items-center"
          style={{ minHeight: 44, minWidth: 44 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleLike}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
        >
          <View style={{ height: 26, justifyContent: 'center' }}>
            <Heart
              size={26}
              weight={isLiked ? 'fill' : 'regular'}
              color={isLiked ? likedColor : iconColor}
            />
          </View>
          {likeCount > 0 && (
            <Text
              className="text-caption mt-0.5 font-medium"
              style={{ color: iconColor }}
            >
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          className="items-center"
          style={{ minHeight: 44, minWidth: 44 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleComment}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <View style={{ height: 26, justifyContent: 'center' }}>
            <ChatCircle
              size={26}
              weight="regular"
              color={iconColor}
            />
          </View>
          {replyCount > 0 && (
            <Text
              className="text-caption mt-0.5 font-medium"
              style={{ color: iconColor }}
            >
              {replyCount}
            </Text>
          )}
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity
          className="items-center"
          style={{ minHeight: 44, minWidth: 44 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleBookmark}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <View style={{ height: 26, justifyContent: 'center' }}>
            <BookmarkSimple
              size={26}
              weight={isBookmarked ? 'fill' : 'regular'}
              color={isBookmarked ? bookmarkedColor : iconColor}
            />
          </View>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          className="items-center"
          style={{ minHeight: 44, minWidth: 44 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleShare}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <View style={{ height: 26, justifyContent: 'center' }}>
            <Share
              size={26}
              weight="regular"
              color={iconColor}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
