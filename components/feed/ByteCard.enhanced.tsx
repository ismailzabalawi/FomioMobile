import React, { useState, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable, 
  useWindowDimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/avatar';
import { Heart, ChatCircle, BookmarkSimple } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { 
  typography, 
  spacing, 
  borderRadius, 
  animation, 
  components,
  getThemeColors,
  createTextStyle,
  createShadowStyle,
  accessibility 
} from '@/shared/design-system';

export interface ByteCardProps {
  id: string;
  content: string;
  teretName: string;
  author: {
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
  isBookmarked?: boolean;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onBookmark?: () => void;
  onTeretPress?: () => void;
  style?: any;
}

/**
 * Enhanced ByteCard Component
 * 
 * Features:
 * - Design system integration
 * - Micro-interactions and animations
 * - Performance optimization with React.memo
 * - Enhanced accessibility
 * - Responsive design
 * - Haptic feedback ready
 */
export const ByteCardEnhanced = memo<ByteCardProps>(({
  id,
  content,
  teretName,
  author,
  likes,
  comments,
  timestamp,
  isLiked,
  isBookmarked = false,
  onPress,
  onLike,
  onComment,
  onBookmark,
  onTeretPress,
  style,
}) => {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const colors = getThemeColors(isDark);
  
  // Animation states with Reanimated
  const likeScale = useSharedValue(1);
  const [pressedAction, setPressedAction] = useState<number | null>(null);
  
  // Animated style for like button
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  
  // Memoized callbacks for performance
  const handleLike = useCallback(() => {
    // Haptic feedback for like action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Ignore haptic errors
    });
    
    // Micro-interaction: spring animation for more natural feel
    likeScale.value = withSpring(1.2, {
      damping: 8,
      stiffness: 200,
    }, () => {
      likeScale.value = withSpring(1, {
        damping: 8,
        stiffness: 200,
      });
    });
    
    onLike();
  }, [onLike, likeScale]);
  
  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
    onComment();
  }, [onComment]);
  
  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Ignore haptic errors
    });
    onBookmark?.();
  }, [onBookmark]);
  
  const handleTeretPress = useCallback(() => {
    onTeretPress?.();
  }, [onTeretPress]);
  
  // Dynamic styles based on theme and screen size
  const dynamicStyles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      ...createShadowStyle('sm', isDark),
      // Responsive width
      maxWidth: width > 768 ? 600 : '100%',
      alignSelf: width > 768 ? 'center' : 'stretch',
    },
    
    authorName: createTextStyle('bodyMedium', colors.text),
    timestamp: createTextStyle('caption', colors.textSecondary),
    content: createTextStyle('body', colors.text, {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      lineHeight: typography.lineHeight.relaxed * typography.fontSize.base,
    }),
    
    teretBadge: {
      backgroundColor: isDark ? colors.primaryVariant + '20' : colors.primary + '10',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
    },
    
    teretText: createTextStyle('caption', colors.primary, {
      fontWeight: typography.fontWeight.medium,
    }),
    
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      minWidth: components.touchTarget.minSize,
      minHeight: components.touchTarget.minSize,
      justifyContent: 'center',
    },
    
    actionButtonPressed: {
      backgroundColor: colors.primary + '10',
      transform: [{ scale: 0.95 }],
    },
    
    actionCount: createTextStyle('caption', colors.textSecondary, {
      marginLeft: spacing.xs,
      fontWeight: typography.fontWeight.medium,
    }),
    
    actionCountActive: {
      color: colors.primary,
    },
  });
  
  return (
    <TouchableOpacity 
      style={[dynamicStyles.card, style]} 
      onPress={onPress} 
      activeOpacity={0.95}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Post by ${author.name}: ${content.substring(0, 100)}...`}
    >
      {/* Author Section */}
      <View style={styles.authorRow}>
        <Avatar 
          source={{ uri: author.avatar }} 
          size="sm" 
          fallback={author.name.charAt(0).toUpperCase()}
        />
        <View style={styles.authorInfo}>
          <Text style={dynamicStyles.authorName}>{author.name}</Text>
          <Text style={dynamicStyles.timestamp}>{timestamp}</Text>
        </View>
      </View>
      
      {/* Content */}
      <Text style={dynamicStyles.content} numberOfLines={0}>
        {content}
      </Text>
      
      {/* Teret Badge */}
      <TouchableOpacity 
        style={dynamicStyles.teretBadge} 
        onPress={handleTeretPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`View all posts in ${teretName}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={dynamicStyles.teretText}>in {teretName}</Text>
      </TouchableOpacity>
      
      {/* Action Bar */}
      <View style={styles.actionBar}>
        {/* Like Button */}
        <Pressable
          onPress={handleLike}
          onPressIn={() => setPressedAction(0)}
          onPressOut={() => setPressedAction(null)}
          style={({ pressed }) => [
            dynamicStyles.actionButton,
            (pressedAction === 0 || pressed) && dynamicStyles.actionButtonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLiked ? accessibility.labels.unlike : accessibility.labels.like}
          accessibilityState={{ selected: isLiked }}
        >
          <Animated.View style={likeAnimatedStyle}>
            <Heart 
              size={20} 
              weight={isLiked ? 'fill' : 'regular'} 
              color={isLiked ? colors.error : colors.textSecondary} 
            />
          </Animated.View>
          <Text style={[
            dynamicStyles.actionCount,
            isLiked && dynamicStyles.actionCountActive,
          ]}>
            {likes}
          </Text>
        </Pressable>
        
        {/* Comment Button */}
        <Pressable
          onPress={handleComment}
          onPressIn={() => setPressedAction(1)}
          onPressOut={() => setPressedAction(null)}
          style={({ pressed }) => [
            dynamicStyles.actionButton,
            (pressedAction === 1 || pressed) && dynamicStyles.actionButtonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessibility.labels.comment}
        >
          <ChatCircle 
            size={20} 
            weight="regular" 
            color={colors.textSecondary} 
          />
          <Text style={dynamicStyles.actionCount}>{comments}</Text>
        </Pressable>
        
        {/* Bookmark Button */}
        {onBookmark && (
          <Pressable
            onPress={handleBookmark}
            onPressIn={() => setPressedAction(2)}
            onPressOut={() => setPressedAction(null)}
            style={({ pressed }) => [
              dynamicStyles.actionButton,
              (pressedAction === 2 || pressed) && dynamicStyles.actionButtonPressed,
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={accessibility.labels.bookmark}
            accessibilityState={{ selected: isBookmarked }}
          >
            <BookmarkSimple 
              size={20} 
              weight={isBookmarked ? 'fill' : 'regular'} 
              color={isBookmarked ? colors.primary : colors.textSecondary} 
            />
          </Pressable>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Static styles that don't depend on theme
const styles = StyleSheet.create({
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  authorInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});

// Display name for debugging
ByteCardEnhanced.displayName = 'ByteCardEnhanced';

