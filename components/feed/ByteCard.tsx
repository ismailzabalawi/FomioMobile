import React from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ChatCircle, BookmarkSimple, Heart } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Avatar } from '../ui/avatar';
import { getThemeColors, spacing, borderRadius, createTextStyle } from '@/shared/design-system';
import { useBookmarkStore } from '@/shared/useBookmarkSync';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
export function ByteCard({
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
  const { isDark, isAmoled } = useTheme();
  const colors = getThemeColors(isDark);
  
  // Read bookmark state from store, fallback to prop
  const isBookmarkedFromStore = useBookmarkStore(state => state.isBookmarked(Number(id)));
  const isBookmarked = isBookmarkedFromStore || isBookmarkedProp || false;
  
  // Handle avatar source
  const avatarSource = author.avatar && author.avatar.trim() !== '' 
    ? { uri: author.avatar } 
    : undefined;
  
  // Build category path: "Hub" or "Hub › Teret"
  const categoryPath = teret ? `${hub} › ${teret}` : hub;
  
  // AMOLED dark mode uses true black
  const cardBackground = isAmoled ? '#000000' : colors.surface;
  const cardBorder = isAmoled ? '#1a1a1a' : colors.border;

  // Press feedback animation
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorder,
        },
        animatedStyle,
        style,
      ]}
      onPressIn={() => {
        scale.value = withSpring(0.98);
        opacity.value = withSpring(0.8);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      }}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${author.name || 'Unknown'}`}
    >
      <View style={styles.row}>
        {/* Avatar */}
        <Avatar
          source={avatarSource}
          size="md"
          fallback={author.name || 'U'}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Title row with unread indicator and bookmark */}
          <View style={styles.titleRow}>
            <Text 
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {isBookmarked && (
              <BookmarkSimple 
                size={16} 
                weight="fill" 
                color={isDark ? '#fbbf24' : '#f59e0b'} 
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          {/* Meta row: Category path + Activity + Replies + Like count */}
          <View style={styles.metaRow}>
            {/* Category path */}
            <TouchableOpacity
              onPress={onCategoryPress}
              disabled={!onCategoryPress}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessible={!!onCategoryPress}
              accessibilityRole={onCategoryPress ? 'button' : 'text'}
              accessibilityLabel={`View ${categoryPath}`}
            >
              <Text style={[styles.category, { color: colors.textSecondary }]}>
                {categoryPath}
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>

            {/* Activity timestamp */}
            <Text style={[styles.activity, { color: colors.textSecondary }]}>
              {activity}
            </Text>

            {/* Unread indicator */}
            {unreadCount && unreadCount > 0 && (
              <>
                <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                <View style={styles.unreadBadge}>
                  <View 
                    style={[
                      styles.unreadDot, 
                      { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }
                    ]} 
                  />
                  <Text 
                    style={[
                      styles.unreadText, 
                      { color: isDark ? '#3b82f6' : '#2563eb' }
                    ]}
                  >
                    {unreadCount} new
                  </Text>
                </View>
              </>
            )}

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Like count */}
            {likeCount !== undefined && likeCount > 0 && (
              <View style={styles.likes}>
                <Heart size={16} weight="regular" color={colors.textSecondary} />
                <Text style={[styles.likesText, { color: colors.textSecondary }]}>
                  {likeCount}
                </Text>
              </View>
            )}

            {/* Replies count */}
            <View style={styles.replies}>
              <ChatCircle size={16} weight="regular" color={colors.textSecondary} />
              <Text style={[styles.repliesText, { color: colors.textSecondary }]}>
                {replies}
              </Text>
            </View>
          </View>

          {/* Media thumbnail hint */}
          {hasMedia && coverImage && (
            <View style={styles.mediaThumbnail}>
              <Image
                source={{ uri: coverImage }}
                style={styles.thumbnailImage}
                contentFit="cover"
              />
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
  } as ViewStyle,
  
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as ViewStyle,
  
  content: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0, // Allows text to wrap properly
  } as ViewStyle,
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  } as ViewStyle,
  
  title: {
    ...createTextStyle('bodyMedium', undefined, {
      fontWeight: '700',
    }),
    flex: 1,
  } as TextStyle,
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  } as ViewStyle,
  
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  } as ViewStyle,
  
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  } as ViewStyle,
  
  unreadText: {
    ...createTextStyle('caption', undefined, {
      fontWeight: '600',
    }),
  } as TextStyle,
  
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  } as ViewStyle,
  
  likesText: {
    ...createTextStyle('caption', undefined, {
      fontWeight: '600',
      marginLeft: spacing.xs,
    }),
  } as TextStyle,
  
  mediaThumbnail: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  } as ViewStyle,
  
  thumbnailImage: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
  } as ImageStyle,
  
  category: {
    ...createTextStyle('caption'),
  } as TextStyle,
  
  separator: {
    ...createTextStyle('caption'),
    marginHorizontal: spacing.xs,
  } as TextStyle,
  
  activity: {
    ...createTextStyle('caption'),
  } as TextStyle,
  
  spacer: {
    flex: 1,
    minWidth: spacing.sm,
  } as ViewStyle,
  
  replies: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  } as ViewStyle,
  
  repliesText: {
    ...createTextStyle('caption', undefined, {
      fontWeight: '600',
      marginLeft: spacing.xs,
    }),
  } as TextStyle,
});
