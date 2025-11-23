import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';
import { Heart, ChatCircle } from 'phosphor-react-native';
import { MarkdownContent } from './MarkdownContent';

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
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
}

export function CommentItem({ comment, isReply, onLike, onReply }: CommentItemProps) {
  const { isDark, isAmoled, themeMode } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  
  // Animate on mount
  useEffect(() => {
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
  }, []);
  
  // Handle empty avatar URLs
  const avatarSource = comment.author.avatar && comment.author.avatar.trim() !== '' 
    ? { uri: comment.author.avatar } 
    : undefined;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
      }}
      className={`flex-row items-start py-3 pr-2 border-b ${isReply ? 'ml-11' : ''} border-fomio-border-soft dark:border-fomio-border-soft-dark`}
    > 
      {avatarSource ? (
        <Image 
          source={avatarSource} 
          className="w-8 h-8 rounded-full mr-3 mt-0.5"
          accessibilityLabel={`${comment.author.name}'s avatar`} 
        />
      ) : (
        <View className={`w-8 h-8 rounded-full mr-3 mt-0.5 justify-center items-center bg-fomio-muted dark:bg-fomio-muted-dark`}>
          <Text className={`text-xs font-semibold ${isAmoled ? 'text-fomio-bg-dark' : isDark ? 'text-fomio-bg-dark' : 'text-fomio-bg'}`}>
            {comment.author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center mb-0.5">
          <Text className="text-[15px] font-semibold mr-2 text-fomio-foreground dark:text-fomio-foreground-dark">
            {comment.author.name}
          </Text>
          <Text className="text-xs font-normal text-fomio-muted dark:text-fomio-muted-dark">
            {comment.createdAt}
          </Text>
        </View>
        <View className="mb-1.5">
          <MarkdownContent 
            content={comment.content} 
            isRawMarkdown={false} 
          />
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
              color={colors.foreground} 
            />
            <Text className="text-[13px] ml-1 font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
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
            <ChatCircle size={18} weight="regular" color={colors.foreground} />
            <Text className="text-[13px] ml-1 font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
              Reply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
