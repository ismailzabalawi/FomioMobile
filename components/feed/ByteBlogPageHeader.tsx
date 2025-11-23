import React, { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { TopicData } from '@/shared/useTopic';
import { MarkdownContent } from './MarkdownContent';

interface ByteBlogPageHeaderProps {
  topic: TopicData;
  avatarSource: ImageSource | null | undefined;
  isDark: boolean;
  isAmoled: boolean;
  formatTimeAgo: (dateString: string) => string;
  flatListRef?: React.RefObject<FlatList>;
}

/**
 * Header section component for ByteBlogPage
 * 
 * UI Spec: ByteBlogPageHeader
 * - Title: text-title, 3 lines max, mb-5
 * - Author row: Avatar (8x8) + Username + Category badge, mb-3
 * - Meta row: Date · Reading time, mb-3
 * - Stats row: Replies · Likes · Views, mb-5
 * - Content: MarkdownContent with mb-8
 * - Uses semantic tokens: text-title, text-body, text-caption
 * - Spacing: Consistent vertical rhythm (mb-3, mb-5, mb-8)
 * - Separators: Middle dot (·) for modern, minimal aesthetic
 * - Theme-aware: All colors via semantic tokens
 */
export function ByteBlogPageHeader({
  topic,
  avatarSource,
  isDark,
  isAmoled,
  formatTimeAgo,
  flatListRef,
}: ByteBlogPageHeaderProps) {
  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!topic.content) return 0;
    const wordCount = topic.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [topic.content]);

  return (
    <View className={`px-4 pt-0.5 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}> 
      {/* 1. Title */}
      <Text 
        className="text-title font-bold mb-5 text-fomio-foreground dark:text-fomio-foreground-dark"
        numberOfLines={3}
      >
        {topic.title}
      </Text>

      {/* 2. Avatar + Username · Category */}
      <View className="flex-row items-center mb-3 gap-2">
        {/* Small avatar */}
        {avatarSource ? (
          <Image 
            source={avatarSource} 
            className="w-8 h-8 rounded-full"
            accessibilityLabel={`${topic.author.username}'s avatar`}
          />
        ) : (
          <View className="w-8 h-8 rounded-full justify-center items-center bg-fomio-muted dark:bg-fomio-muted-dark">
            <Text className={`text-xs font-semibold ${isAmoled ? 'text-fomio-bg-dark' : isDark ? 'text-fomio-bg-dark' : 'text-fomio-bg'}`}>
              {topic.author.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-body font-medium text-fomio-foreground dark:text-fomio-foreground-dark">
          {topic.author.username}
        </Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">·</Text>
        <View 
          className="px-2.5 py-1 rounded-full"
          style={{ 
            backgroundColor: isDark 
              ? `rgba(255, 255, 255, 0.08)` 
              : `rgba(0, 0, 0, 0.06)`,
            borderWidth: 1,
            borderColor: topic.category.color + '40'
          }}
        >
          <Text 
            className="text-caption font-semibold"
            style={{ color: topic.category.color }}
          >
            {topic.category.name}
          </Text>
        </View>
      </View>

      {/* 3. Date · Reading time */}
      <View className="flex-row items-center mb-3 gap-x-1">
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
          {formatTimeAgo(topic.createdAt)}
        </Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">·</Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
          {readingTime} min read
        </Text>
      </View>

      {/* 4. Replies · Likes · Views */}
      <View className="flex-row items-center mb-5 gap-x-1">
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
          {topic.replyCount} replies
        </Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">·</Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
          {topic.likeCount} likes
        </Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">·</Text>
        <Text className="text-caption text-fomio-muted dark:text-fomio-muted-dark">
          {topic.views} views
        </Text>
      </View>
      
      {/* 5. Body of topic */}
      <View className="mb-8">
        <MarkdownContent 
          content={topic.content} 
          isRawMarkdown={false} 
        />
      </View>
      
    </View>
  );
}
