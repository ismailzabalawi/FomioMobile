/**
 * YouTubeCard - YouTube video link preview card
 * 
 * Thumbnail with play button overlay and duration badge
 * Tap expands card and loads WebView for inline playback
 * Uses LazyVideoEmbed pattern from MarkdownContent
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { LinkPreview } from './types';
import { PremiumPressable } from './PremiumPressable';

interface YouTubeCardProps {
  preview: LinkPreview;
  onPress?: () => void;
}

/**
 * Build YouTube embed URL
 */
function buildYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const startParam = startSeconds ? `&start=${startSeconds}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1${startParam}`;
}

/**
 * Build HTML for video embed
 */
function buildVideoEmbedHtml(url: string): string {
  const escapedUrl = url.replace(/"/g, '&quot;');
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body { margin: 0; padding: 0; background: transparent; height: 100%; }
      .frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe class="frame" src="${escapedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </body>
</html>`;
}

/**
 * Lazy video embed component
 */
function LazyVideoEmbed({
  embedUrl,
  tokens,
}: {
  embedUrl: string;
  tokens: any;
}) {
  const [shouldLoad, setShouldLoad] = useState(false);

  if (!shouldLoad) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShouldLoad(true)}
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: 12,
          backgroundColor: tokens.colors.surfaceMuted,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: tokens.colors.text, fontSize: 64, opacity: 0.8 }}>
          ▶
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <WebView
      source={{ html: buildVideoEmbedHtml(embedUrl) }}
      originWhitelist={['*']}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scrollEnabled={false}
      allowsFullscreenVideo
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: 'transparent', aspectRatio: 16 / 9 }}
    />
  );
}

/**
 * YouTube card component with inline playback
 */
export function YouTubeCard({ preview, onPress }: YouTubeCardProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = getTokens(mode);

  const [isExpanded, setIsExpanded] = useState(false);

  const videoId = preview.videoId || preview.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)?.[1];
  const embedUrl = videoId ? buildYouTubeEmbedUrl(videoId) : null;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    
    // Toggle expanded state to show inline player
    setIsExpanded(!isExpanded);
  };

  if (isExpanded && embedUrl) {
    // Show inline video player
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderColor: tokens.colors.border,
          },
        ]}
      >
        <LazyVideoEmbed embedUrl={embedUrl} tokens={tokens} />
        {preview.title && (
          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.text,
                },
              ]}
              numberOfLines={2}
            >
              {preview.title}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Show thumbnail with play button
  return (
    <PremiumPressable onPress={handlePress} style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderColor: tokens.colors.border,
            shadowColor: tokens.colors.shadow || '#000',
          },
        ]}
      >
        <View style={styles.thumbnailContainer}>
          {preview.image ? (
            <Image
              source={{ uri: preview.image }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
              accessibilityLabel={preview.title || 'YouTube video thumbnail'}
            />
          ) : (
            <View
              style={[
                styles.thumbnailPlaceholder,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.playIcon, { color: tokens.colors.text }]}>▶</Text>
            </View>
          )}
          
          {/* Play button overlay */}
          <View style={styles.playButtonOverlay} pointerEvents="none">
            <View
              style={[
                styles.playButton,
                {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              ]}
            >
              <Text style={styles.playIconLarge}>▶</Text>
            </View>
          </View>
          
          {/* Duration badge */}
          {preview.duration && (
            <View
              style={[
                styles.durationBadge,
                {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                },
              ]}
            >
              <Text style={styles.durationText}>{preview.duration}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          {preview.title && (
            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.text,
                },
              ]}
              numberOfLines={2}
            >
              {preview.title}
            </Text>
          )}
          
          <Text
            style={[
              styles.siteName,
              {
                color: tokens.colors.accent,
              },
            ]}
          >
            YouTube {preview.siteName ? `• ${preview.siteName}` : ''}
          </Text>
        </View>
      </View>
    </PremiumPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconLarge: {
    fontSize: 32,
    color: '#FFFFFF',
    marginLeft: 4, // Slight offset for visual centering
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  siteName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

