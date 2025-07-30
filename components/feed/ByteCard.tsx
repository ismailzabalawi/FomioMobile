import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, Pressable, Alert } from 'react-native';
import { Avatar } from '../ui/avatar';
import { Heart, ChatCircle, BookmarkSimple, DotsThree, Share } from 'phosphor-react-native';
import { useTheme } from '../../components/shared/theme-provider';
import { usePostActions } from '../../shared/usePostActions';

export interface ByteCardProps {
  id: string;
  content: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  category: {
    name: string;
    color: string;
    slug: string;
  };
  tags: string[];
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
  isBookmarked?: boolean;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onBookmark?: () => void;
  onCategoryPress?: () => void;
  onTagPress?: (tag: string) => void;
  onShare?: () => void;
  onMore?: () => void;
  style?: ViewStyle;
}

// UI Spec: Modern ByteCard — Clean, spacious design with subtle shadows, smooth interactions, and clear visual hierarchy. 
// Follows Fomio's design language of clarity and minimalism while maintaining rich functionality.
export function ByteCard({
  id,
  content,
  author,
  category,
  tags,
  likes,
  comments,
  timestamp,
  isLiked,
  isBookmarked,
  onPress,
  onLike,
  onComment,
  onBookmark,
  onCategoryPress,
  onTagPress,
  onShare,
  onMore,
  style,
}: ByteCardProps) {
  const { isDark, isAmoled } = useTheme();
  const [pressed, setPressed] = useState<number | null>(null);
  
  // Use the post actions hook
  const {
    isLiked: currentIsLiked,
    isBookmarked: currentIsBookmarked,
    likeCount: currentLikeCount,
    isLoading,
    error,
    toggleLike,
    toggleBookmark,
  } = usePostActions(parseInt(id), likes, isLiked, isBookmarked);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#374151' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
    border: isAmoled ? '#000000' : (isDark ? '#4b5563' : '#e5e7eb'),
    teretBg: isDark ? '#1e40af' : '#dbeafe',
    teretText: isDark ? '#93c5fd' : '#1e40af',
    actionBg: isAmoled ? '#000000' : (isDark ? '#374151' : '#f9fafb'),
    pressed: isAmoled ? '#1a1a1a' : (isDark ? '#4b5563' : '#f3f4f6'),
  };

  // Handle empty avatar URLs
  const avatarSource = author.avatar && author.avatar.trim() !== '' 
    ? { uri: author.avatar } 
    : undefined;

  // Parse content to separate title and excerpt
  const contentParts = content.split('\n\n');
  const title = contentParts[0] || '';
  const excerpt = contentParts.slice(1).join('\n\n') || '';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]} 
      onPress={onPress} 
      activeOpacity={0.95}
    >
      {/* Header with Author Info */}
      <View style={styles.header}>
        <View style={styles.authorSection}>
          <Avatar source={avatarSource} size="md" fallback={author.name} />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.text }]}>{author.name}</Text>
            <Text style={[styles.timestamp, { color: colors.secondary }]}>{timestamp}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.moreButton} 
          onPress={onMore}
          accessible
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <DotsThree size={20} weight="bold" color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentSection}>
        {title && (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
        )}
        {excerpt && (
          <Text style={[styles.content, { color: colors.text }]} numberOfLines={4}>
            {excerpt}
          </Text>
        )}
      </View>

      {/* Category and Tags Section */}
      <View style={styles.metadataSection}>
        {/* Category Badge */}
        <TouchableOpacity 
          style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]} 
          onPress={onCategoryPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`View all bytes in ${category.name}`}
        >
          <Text style={[styles.categoryText, { color: category.color }]}>
            {category.name}
          </Text>
        </TouchableOpacity>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 3).map((tag, index) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagBadge, { backgroundColor: colors.teretBg }]}
                onPress={() => onTagPress?.(tag)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`View all bytes tagged with ${tag}`}
              >
                <Text style={[styles.tagText, { color: colors.teretText }]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            ))}
            {tags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: colors.secondary }]}>
                +{tags.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.actionBg, borderTopColor: colors.border }]}>
        <Pressable
          onPress={async () => {
            try {
              await toggleLike();
              if (onLike) onLike();
            } catch (error) {
              Alert.alert('Error', 'Failed to update like status');
            }
          }}
          onPressIn={() => setPressed(0)}
          onPressOut={() => setPressed(null)}
          style={({ pressed: isPressed }) => [
            styles.actionButton,
            (pressed === 0 || isPressed) && { backgroundColor: colors.pressed },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={currentIsLiked ? 'Unlike' : 'Like'}
          disabled={isLoading}
        >
          <Heart 
            size={20} 
            weight={currentIsLiked ? 'fill' : 'regular'} 
            color={currentIsLiked ? colors.accent : colors.secondary} 
          />
          <Text style={[
            styles.actionCount, 
            { color: currentIsLiked ? colors.accent : colors.secondary }
          ]}>
            {currentLikeCount > 0 ? currentLikeCount : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={onComment}
          onPressIn={() => setPressed(1)}
          onPressOut={() => setPressed(null)}
          style={({ pressed: isPressed }) => [
            styles.actionButton,
            (pressed === 1 || isPressed) && { backgroundColor: colors.pressed },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <ChatCircle size={20} weight="regular" color={colors.secondary} />
          <Text style={[styles.actionCount, { color: colors.secondary }]}>
            {comments > 0 ? comments : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={onShare}
          onPressIn={() => setPressed(2)}
          onPressOut={() => setPressed(null)}
          style={({ pressed: isPressed }) => [
            styles.actionButton,
            (pressed === 2 || isPressed) && { backgroundColor: colors.pressed },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Share size={20} weight="regular" color={colors.secondary} />
        </Pressable>

        <Pressable
          onPress={async () => {
            try {
              await toggleBookmark();
              if (onBookmark) onBookmark();
            } catch (error) {
              Alert.alert('Error', 'Failed to update bookmark status');
            }
          }}
          onPressIn={() => setPressed(3)}
          onPressOut={() => setPressed(null)}
          style={({ pressed: isPressed }) => [
            styles.actionButton,
            (pressed === 3 || isPressed) && { backgroundColor: colors.pressed },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={currentIsBookmarked ? 'Remove bookmark' : 'Bookmark'}
          disabled={isLoading}
        >
          <BookmarkSimple 
            size={20} 
            weight={currentIsBookmarked ? 'fill' : 'regular'} 
            color={currentIsBookmarked ? colors.accent : colors.secondary} 
          />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  } as ViewStyle,
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  } as ViewStyle,
  
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  } as ViewStyle,
  
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  } as TextStyle,
  
  timestamp: {
    fontSize: 13,
    fontWeight: '400',
  } as TextStyle,
  
  moreButton: {
    padding: 8,
    borderRadius: 8,
  } as ViewStyle,
  
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  } as ViewStyle,
  
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  } as TextStyle,

  content: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    opacity: 0.9,
  } as TextStyle,
  
  metadataSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  } as ViewStyle,
  
  categoryBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  } as ViewStyle,
  
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  } as TextStyle,
  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  } as TextStyle,
  
  moreTagsText: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 4,
  } as TextStyle,
  
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  } as ViewStyle,
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 44,
    justifyContent: 'center',
  } as ViewStyle,
  
  actionCount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  } as TextStyle,
}); 