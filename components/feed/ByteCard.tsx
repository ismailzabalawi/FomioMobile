import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChatCircle, BookmarkSimple, Heart } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Avatar } from '../ui/avatar';
import { BORDER_RADIUS, SPACING, getThemeColors } from '@/shared/theme-constants';
import { useBookmarkStore } from '@/shared/useBookmarkSync';

const MIN_TOUCH_TARGET = 44;

export interface ByteCardProps {
  id: string | number;
  title: string;
  hub: string;
  teret?: string;
  author: {
    name?: string;
    avatar?: string;
  };
  replies: number;
  activity: string; // Pre-formatted timestamp (e.g., "3h", "2d", "Just now")
  onPress: () => void;
  onCategoryPress?: () => void;
  style?: ViewStyle;
  unreadCount?: number;
  isBookmarked?: boolean;
  likeCount?: number;
  hasMedia?: boolean;
  coverImage?: string;
}

/**
 * ByteCard Component
 *
 * Simplified card component matching Discourse /latest API structure:
 * - Title (always visible, wraps to next line)
 * - Hub and optional Teret (category path)
 * - Poster avatar
 * - Number of replies
 * - Activity (formatted timestamp)
 */
function ByteCardComponent({
  id,
  title,
  hub,
  teret,
  author,
  replies,
  activity,
  onPress,
  onCategoryPress,
  style,
  unreadCount,
  isBookmarked: isBookmarkedProp,
  likeCount,
  hasMedia,
  coverImage,
}: ByteCardProps) {
  const { themeMode, isAmoled } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isAmoled), [themeMode, isAmoled]);

  // Read bookmark state from store, fallback to prop
  const isBookmarkedFromStore = useBookmarkStore(state => state.isBookmarked(Number(id)));
  const isBookmarked = isBookmarkedFromStore || isBookmarkedProp || false;

  // Handle avatar source
  const avatarSource = author.avatar && author.avatar.trim() !== ''
    ? { uri: author.avatar }
    : undefined;

  // Build category path: "Hub" or "Hub › Teret"
  const categoryPath = teret ? `${hub} › ${teret}` : hub;

  const cardStyle = useMemo(
    () => ({
      backgroundColor: colors.card,
      borderColor: colors.border,
      minHeight: MIN_TOUCH_TARGET,
    }),
    [colors.border, colors.card],
  );

  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress();
  }, [onPress, triggerHaptic]);

  return (
    <Pressable
      className="mx-4 my-2 rounded-fomio-card border px-4 py-4"
      style={({ pressed }) => [cardStyle, pressed && { opacity: 0.94 }, style]}
      onPress={handlePress}
      android_ripple={{ color: `${colors.border}50`, foreground: true }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${author.name || 'Unknown'}`}
      accessibilityHint="Opens the byte details"
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <Avatar
          source={avatarSource}
          size="md"
          fallback={author.name || 'U'}
        />

        {/* Content */}
        <View className="ml-4 flex-1" style={{ minWidth: 0 }}>
          {/* Title row with unread indicator and bookmark */}
          <View className="mb-1 flex-row items-start">
            <Text
              className="flex-1 text-body font-semibold text-fomio-foreground dark:text-fomio-foreground-dark"
              numberOfLines={2}
            >
              {title}
            </Text>
            {isBookmarked && (
      <BookmarkSimple
        size={16}
        weight="fill"
        color={colors.bookmark}
        style={{ marginLeft: SPACING.sm }}
      />
            )}
          </View>

          <MetaRow
            categoryPath={categoryPath}
            activity={activity}
            unreadCount={unreadCount}
            onCategoryPress={onCategoryPress}
            colors={colors}
          />

          <EngagementRow
            replies={replies}
            likeCount={likeCount}
            colors={colors}
          />

          <MediaThumbnail coverImage={coverImage} hasMedia={hasMedia} />
        </View>
      </View>
    </Pressable>
  );
}

type MetaRowProps = {
  categoryPath: string;
  activity: string;
  unreadCount?: number;
  onCategoryPress?: () => void;
  colors: ReturnType<typeof getThemeColors>;
};

const MetaRow = React.memo(function MetaRow({
  categoryPath,
  activity,
  unreadCount,
  onCategoryPress,
  colors,
}: MetaRowProps) {
  const handleCategoryPress = useCallback(() => {
    if (onCategoryPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onCategoryPress();
    }
  }, [onCategoryPress]);

  return (
    <View className="flex-row flex-wrap items-center" accessible accessibilityRole="text">
      <Pressable
        onPress={handleCategoryPress}
        disabled={!onCategoryPress}
        hitSlop={12}
        className="min-h-11 justify-center"
        accessibilityRole={onCategoryPress ? 'button' : 'text'}
        accessibilityLabel={`View ${categoryPath}`}
        accessibilityHint="Opens the hub and category for this byte"
      >
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">{categoryPath}</Text>
      </Pressable>

      <Text className="mx-1 text-caption text-fomio-muted dark:text-fomio-muted-dark">•</Text>

      <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">{activity}</Text>

      {unreadCount && unreadCount > 0 && (
        <>
          <Text className="mx-1 text-caption text-fomio-muted dark:text-fomio-muted-dark">•</Text>
          <View
            className="ml-2 flex-row items-center"
            accessibilityRole="text"
            accessibilityLabel={`${unreadCount} new updates`}
            accessible
          >
            <View
              className="mr-1 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colors.accent }}
            />
            <Text
              className="text-caption font-semibold"
              style={{ color: colors.accent }}
            >
              {unreadCount} new
            </Text>
          </View>
        </>
      )}
    </View>
  );
});

type EngagementRowProps = {
  replies: number;
  likeCount?: number;
  colors: ReturnType<typeof getThemeColors>;
};

const EngagementRow = React.memo(function EngagementRow({ replies, likeCount, colors }: EngagementRowProps) {
  return (
    <View
      className="mt-2 flex-row items-center"
      style={{ minHeight: MIN_TOUCH_TARGET }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${replies} replies${likeCount ? `, ${likeCount} likes` : ''}`}
    >
      {likeCount !== undefined && likeCount > 0 && (
        <View className="mr-4 flex-row items-center">
          <Heart size={16} weight="regular" color={colors.comment} />
          <Text className="ml-1 text-caption font-semibold text-fomio-muted dark:text-fomio-muted-dark">
            {likeCount}
          </Text>
        </View>
      )}

      <View className="flex-row items-center">
        <ChatCircle size={16} weight="regular" color={colors.comment} />
        <Text className="ml-1 text-caption font-semibold text-fomio-muted dark:text-fomio-muted-dark">{replies}</Text>
      </View>
    </View>
  );
});

type MediaThumbnailProps = {
  coverImage?: string;
  hasMedia?: boolean;
};

const MediaThumbnail = React.memo(function MediaThumbnail({ coverImage, hasMedia }: MediaThumbnailProps) {
  if (!hasMedia || !coverImage) {
    return null;
  }

  return (
    <View className="mt-2 self-end overflow-hidden rounded-lg">
      <Image
        source={{ uri: coverImage }}
        style={{
          width: 80,
          height: 60,
          borderRadius: BORDER_RADIUS.lg,
        }}
        contentFit="cover"
      />
    </View>
  );
});

export const ByteCard = React.memo(ByteCardComponent);
