import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ChatCircle } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { Avatar } from '../ui/avatar';
import { getThemeColors, spacing, borderRadius, createTextStyle } from '@/shared/design-system';

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
}: ByteCardProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = getThemeColors(isDark);
  
  // Handle avatar source
  const avatarSource = author.avatar && author.avatar.trim() !== '' 
    ? { uri: author.avatar } 
    : undefined;
  
  // Build category path: "Hub" or "Hub › Teret"
  const categoryPath = teret ? `${hub} › ${teret}` : hub;
  
  // AMOLED dark mode uses true black
  const cardBackground = isAmoled ? '#000000' : colors.surface;
  const cardBorder = isAmoled ? '#1a1a1a' : colors.border;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorder,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
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
          {/* Title - always visible, wraps to next line */}
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>

          {/* Meta row: Category path + Activity + Replies */}
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

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Replies count */}
            <View style={styles.replies}>
              <ChatCircle size={16} weight="regular" color={colors.textSecondary} />
              <Text style={[styles.repliesText, { color: colors.textSecondary }]}>
                {replies}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  
  title: {
    ...createTextStyle('bodyMedium', undefined, {
      fontWeight: '700',
    }),
    marginBottom: spacing.xs,
  } as TextStyle,
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  } as ViewStyle,
  
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
