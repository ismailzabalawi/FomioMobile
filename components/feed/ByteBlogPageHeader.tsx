import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { TopicData } from '@/shared/useTopic';
import { MarkdownContent } from './MarkdownContent';

interface ByteBlogPageHeaderProps {
  topic: TopicData;
  avatarSource: ImageSource | null | undefined;
  isDark: boolean;
  isAmoled: boolean;
  formatTimeAgo: (dateString: string) => string;
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
}: ByteBlogPageHeaderProps) {
  // Calculate if cover image exists (handle undefined, null, empty string, whitespace)
  const hasCoverImage = useMemo(() => {
    return topic.coverImage && topic.coverImage.trim().length > 0;
  }, [topic.coverImage]);

  // Calculate reading time with media consideration
  const readingTime = useMemo(() => {
    if (!topic.content) return 0;
    
    // Base word count
    const wordCount = topic.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const baseMinutes = wordCount / 200; // 200 words per minute
    
    // Count images (12 seconds per image)
    const imageMatches = topic.content.match(/<img[^>]*>/gi);
    const imageCount = imageMatches ? imageMatches.length : 0;
    const imageTime = (imageCount * 12) / 60; // Convert to minutes
    
    // Count videos/embeds (estimate 2 minutes per video)
    const videoMatches = topic.content.match(/(youtube|vimeo|video-onebox|iframe)/gi);
    const videoCount = videoMatches ? videoMatches.length : 0;
    const videoTime = videoCount * 2;
    
    // Account for cover image if present
    const coverImageTime = hasCoverImage ? 12 / 60 : 0; // 12 seconds for cover image
    
    // Total reading time
    const totalMinutes = baseMinutes + imageTime + videoTime + coverImageTime;
    
    return Math.max(1, Math.ceil(totalMinutes));
  }, [topic.content, hasCoverImage]);

  return (
    <View className={`px-4 pt-0.5 ${isAmoled ? 'bg-fomio-bg-dark' : isDark ? 'bg-fomio-bg-dark' : 'bg-fomio-bg'}`}> 
      {/* 0. Cover Image */}
      {hasCoverImage && (
        <Image
          source={{ uri: topic.coverImage }}
          style={{
            width: '100%',
            aspectRatio: 21 / 9, // Wide format for cover images
            borderRadius: 12,
            marginBottom: 20,
            marginHorizontal: -16, // Extend to edges (negative margin to offset px-4)
          }}
          contentFit="cover"
          transition={200}
          accessibilityLabel="Cover image"
        />
      )}
      
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
          linkMetadata={topic.linkMetadata}
          isRawMarkdown={false} 
        />
      </View>
      
    </View>
  );
}
