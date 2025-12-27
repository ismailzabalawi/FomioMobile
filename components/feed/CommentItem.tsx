import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { Heart, ChatCircle } from 'phosphor-react-native';
import { getTokens } from '@/shared/design/tokens';

// UI Spec: CommentItem — Renders a comment or reply with avatar, name, time, text, like/reply actions, and theming.
export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  parentId?: string;
  replyToPostNumber?: number;
  isReply?: boolean;
  isNew?: boolean;
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  isDark?: boolean; // Pass theme from parent when used in portal (e.g., bottom sheet)
  mode?: 'light' | 'dark' | 'darkAmoled'; // Pass mode from parent when used in portal
  shouldAnimate?: boolean;
}

export function CommentItem({ comment, isReply, onLike, onReply, isDark: isDarkProp, mode: modeProp, shouldAnimate }: CommentItemProps) {
  // Use props if provided (for portal contexts), otherwise fall back to theme context
  const themeContext = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : themeContext.isDark;
  const mode = modeProp || (isDark ? 'darkAmoled' : 'light');
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const primaryTextColor = tokens.colors.text; // Use theme token instead of hardcoded color
  const shouldRunAnimation = shouldAnimate ?? comment.isNew ?? false;
  const fadeAnim = useRef(new Animated.Value(shouldRunAnimation ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(shouldRunAnimation ? -10 : 0)).current;
  const plainContent = useMemo(() => toPlainText(comment.content), [comment.content]);
  
  // Animate only for newly added comments to avoid heavy list mounts
  useEffect(() => {
    if (!shouldRunAnimation) {
      fadeAnim.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, shouldRunAnimation]);
  
  // Handle empty avatar URLs
  const avatarSource = comment.author.avatar && comment.author.avatar.trim() !== '' 
    ? { uri: comment.author.avatar } 
    : undefined;

  return (
    <Animated.View
      className={`flex-row items-start py-3 border-b ${isReply ? 'ml-11' : ''}`}
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
          borderBottomColor: tokens.colors.border,
        },
        { paddingHorizontal: 16 },
      ]}
    >
      {avatarSource ? (
        <Image 
          source={avatarSource} 
          className="w-8 h-8 rounded-full mr-3 mt-0.5"
          accessibilityLabel={`${comment.author.name}'s avatar`} 
        />
      ) : (
        <View
          className="w-8 h-8 rounded-full mr-3 mt-0.5 justify-center items-center"
          style={{ backgroundColor: tokens.colors.surfaceMuted }}
        >
          <Text className="text-xs font-semibold" style={{ color: primaryTextColor }}>
            {comment.author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center mb-0.5">
          <Text className="text-[15px] font-semibold mr-2" style={{ color: primaryTextColor }}>
            {comment.author.name}
          </Text>
          <Text className="text-xs font-normal" style={{ color: tokens.colors.muted }}>
            {comment.createdAt}
          </Text>
        </View>
        <View className="mb-1.5">
          <Text style={{ color: primaryTextColor, lineHeight: 22, fontSize: 15 }}>
            {plainContent}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="flex-row items-center p-1 rounded-md"
            onPress={() => onLike?.(comment.id)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Like comment"
          >
            <Heart 
              size={18} 
              weight={comment.likes > 0 ? 'fill' : 'regular'} 
              color={primaryTextColor} 
            />
            <Text className="text-[13px] ml-1 font-medium" style={{ color: primaryTextColor }}>
              {comment.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center p-1 rounded-md"
            onPress={() => onReply?.(comment.id)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Reply to comment"
          >
            <ChatCircle size={18} weight="regular" color={primaryTextColor} />
            <Text className="text-[13px] ml-1 font-medium" style={{ color: primaryTextColor }}>
              Reply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function toPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
