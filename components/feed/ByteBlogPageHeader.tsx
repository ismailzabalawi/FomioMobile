import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TopicData } from '@/shared/useTopic';
import { MarkdownContent } from './MarkdownContent';
import { GradientAvatar } from '@/components/ui/GradientAvatar';
import { useTheme } from '@/components/theme';
import { getTokens, withAlpha } from '@/shared/design/tokens';

interface ByteBlogPageHeaderProps {
  topic: TopicData;
  avatarSource: ImageSource | null | undefined;
  isDark: boolean;
  isAmoled: boolean;
  formatTimeAgo: (dateString: string) => string;
  scrollY?: SharedValue<number>; // For parallax effect
}

const HERO_HEIGHT = 400; // Hero section height

/**
 * Premium Blog Page Header with Hero Section
 * 
 * UI Spec: Premium ByteBlogPageHeader
 * - Hero Section (when cover image exists):
 *   - Full-bleed hero image with gradient overlay
 *   - Title and metadata overlaid on image
 *   - Parallax scroll effect
 *   - Premium typography with white text on gradient
 * - Standard Layout (no cover image):
 *   - Title, author, meta, stats in standard layout
 * - Content: MarkdownContent with premium spacing
 * - Uses semantic tokens throughout
 * - Theme-aware: All colors via semantic tokens
 */
export function ByteBlogPageHeader({
  topic,
  avatarSource,
  isDark,
  isAmoled,
  formatTimeAgo,
  scrollY,
}: ByteBlogPageHeaderProps) {
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = useMemo(() => getTokens(mode), [mode]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Calculate header height: status bar + compact header bar
  // Compact header: iOS 32px, Android 36px
  const COMPACT_HEADER_HEIGHT = Platform.OS === 'ios' ? 32 : 36;
  const totalHeaderHeight = insets.top + COMPACT_HEADER_HEIGHT;
  
  // Calculate if cover image exists
  const hasCoverImage = useMemo(() => {
    return topic.coverImage && topic.coverImage.trim().length > 0;
  }, [topic.coverImage]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!topic.content) return 0;
    
    const wordCount = topic.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const baseMinutes = wordCount / 200;
    
    const imageMatches = topic.content.match(/<img[^>]*>/gi);
    const imageCount = imageMatches ? imageMatches.length : 0;
    const imageTime = (imageCount * 12) / 60;
    
    const videoMatches = topic.content.match(/(youtube|vimeo|video-onebox|iframe)/gi);
    const videoCount = videoMatches ? videoMatches.length : 0;
    const videoTime = videoCount * 2;
    
    const coverImageTime = hasCoverImage ? 12 / 60 : 0;
    const totalMinutes = baseMinutes + imageTime + videoTime + coverImageTime;
    
    return Math.max(1, Math.ceil(totalMinutes));
  }, [topic.content, hasCoverImage]);

  // Parallax animation for hero image
  const heroImageStyle = useAnimatedStyle(() => {
    if (!scrollY || !hasCoverImage) {
      return {};
    }
    
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT],
      [0, -HERO_HEIGHT * 0.3],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT],
      [1, 1.1],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ translateY }, { scale }],
    };
  }, [scrollY, hasCoverImage]);

  // Fade out hero content as user scrolls
  const heroContentStyle = useAnimatedStyle(() => {
    if (!scrollY || !hasCoverImage) {
      return { opacity: 1 };
    }
    
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 0.5],
      [1, 0],
      Extrapolate.CLAMP
    );
    
    return { opacity };
  }, [scrollY, hasCoverImage]);

  // Premium Hero Section (when cover image exists)
  if (hasCoverImage) {
    return (
      <View style={{ backgroundColor: tokens.colors.background }}>
        {/* Hero Section with Parallax */}
        {/* Note: On iOS, ScrollView contentInset handles spacing. 
            On Android, ScrollView contentContainerStyle paddingTop handles spacing, so no paddingTop needed here */}
        <View style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
          <Animated.View style={[{ width: '100%', height: HERO_HEIGHT * 1.2 }, heroImageStyle]}>
            <Image
              source={{ uri: topic.coverImage }}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="cover"
              transition={200}
              accessibilityLabel="Cover image"
            />
          </Animated.View>
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.7)',
              'rgba(0,0,0,0.5)',
              'rgba(0,0,0,0.8)',
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Hero Content Overlay */}
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              {
                justifyContent: 'flex-end',
                paddingHorizontal: 20,
                paddingBottom: 40,
                paddingTop: 0, // No top padding needed since container has paddingTop
              },
              heroContentStyle,
            ]}
          >
            {/* Category Badge */}
            {topic.category?.name && (
              <View style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: withAlpha(topic.category.color || '#666', 0.2),
                    borderWidth: 1,
                    borderColor: withAlpha(topic.category.color || '#666', 0.4),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#FFFFFF',
                      letterSpacing: 0.5,
                    }}
                  >
                    {topic.category.name.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Title */}
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#FFFFFF',
                lineHeight: 44,
                letterSpacing: -0.5,
                marginBottom: 20,
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
              numberOfLines={3}
            >
              {topic.title}
            </Text>
            
            {/* Author Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <TouchableOpacity
                onPress={() => router.push(`/profile/${topic.author.username}` as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                activeOpacity={0.7}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`View ${topic.author.username}'s profile`}
              >
                {avatarSource ? (
                  <Image
                    source={avatarSource}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    accessibilityLabel={`${topic.author.username}'s avatar`}
                  />
                ) : (
                  <GradientAvatar
                    username={topic.author.username}
                    size={40}
                  />
                )}
                <View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#FFFFFF',
                      marginBottom: 2,
                    }}
                  >
                    {topic.author.name || topic.author.username}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '400',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {formatTimeAgo(topic.createdAt)} · {readingTime} min read
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
        
        {/* Content Section - Constrained Width for Optimal Reading */}
        <View style={{ paddingTop: 32, paddingBottom: 32 }}>
          {/* Constrained Content Container */}
          <View
            style={{
              maxWidth: 680,
              width: '100%',
              alignSelf: 'center',
              paddingHorizontal: 20,
            }}
          >
            {/* Stats Row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 32,
                gap: 16,
                paddingBottom: 24,
                borderBottomWidth: 1,
                borderBottomColor: tokens.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                  {topic.replyCount}
                </Text>
                <Text style={{ fontSize: 14, color: tokens.colors.muted }}>replies</Text>
              </View>
              <View style={{ width: 1, height: 16, backgroundColor: tokens.colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                  {topic.likeCount}
                </Text>
                <Text style={{ fontSize: 14, color: tokens.colors.muted }}>likes</Text>
              </View>
              <View style={{ width: 1, height: 16, backgroundColor: tokens.colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                  {topic.views}
                </Text>
                <Text style={{ fontSize: 14, color: tokens.colors.muted }}>views</Text>
              </View>
            </View>
            
            {/* Body Content - Premium Reading Typography */}
            <MarkdownContent
              content={topic.content}
              linkMetadata={topic.linkMetadata}
              isRawMarkdown={false}
              readingMode={true}
            />
          </View>
        </View>
      </View>
    );
  }

  // Standard Layout (no cover image)
  return (
    <View style={{ backgroundColor: tokens.colors.background }}>
      <View style={{ paddingTop: 24, paddingBottom: 32 }}>
        {/* Constrained Content Container */}
        <View
          style={{
            maxWidth: 680,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 20,
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: tokens.colors.text,
              lineHeight: 40,
              letterSpacing: -0.5,
              marginBottom: 24,
            }}
            numberOfLines={3}
          >
            {topic.title}
          </Text>

          {/* Author Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => router.push(`/profile/${topic.author.username}` as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`View ${topic.author.username}'s profile`}
            >
              {avatarSource ? (
                <Image
                  source={avatarSource}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  accessibilityLabel={`${topic.author.username}'s avatar`}
                />
              ) : (
                <GradientAvatar
                  username={topic.author.username}
                  size={40}
                />
              )}
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: tokens.colors.text,
                    marginBottom: 2,
                  }}
                >
                  {topic.author.name || topic.author.username}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '400',
                    color: tokens.colors.muted,
                  }}
                >
                  {formatTimeAgo(topic.createdAt)} · {readingTime} min read
                </Text>
              </View>
            </TouchableOpacity>
            
            {topic.category?.name && (
              <>
                <View style={{ width: 1, height: 20, backgroundColor: tokens.colors.border }} />
                
                {/* Category Badge */}
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: withAlpha(topic.category.color || '#666', isDark ? 0.15 : 0.1),
                    borderWidth: 1,
                    borderColor: withAlpha(topic.category.color || '#666', 0.3),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: topic.category.color || tokens.colors.accent,
                      letterSpacing: 0.5,
                    }}
                  >
                    {topic.category.name.toUpperCase()}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Stats Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 32,
              gap: 16,
              paddingBottom: 24,
              borderBottomWidth: 1,
              borderBottomColor: tokens.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                {topic.replyCount}
              </Text>
              <Text style={{ fontSize: 14, color: tokens.colors.muted }}>replies</Text>
            </View>
            <View style={{ width: 1, height: 16, backgroundColor: tokens.colors.border }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                {topic.likeCount}
              </Text>
              <Text style={{ fontSize: 14, color: tokens.colors.muted }}>likes</Text>
            </View>
            <View style={{ width: 1, height: 16, backgroundColor: tokens.colors.border }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.colors.muted }}>
                {topic.views}
              </Text>
              <Text style={{ fontSize: 14, color: tokens.colors.muted }}>views</Text>
            </View>
          </View>

          {/* Body Content - Premium Reading Typography */}
          <MarkdownContent
            content={topic.content}
            linkMetadata={topic.linkMetadata}
            isRawMarkdown={false}
            readingMode={true}
          />
        </View>
      </View>
    </View>
  );
}
