import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useByteCardTokens } from './useByteCardTokens';
import { LinkPreviewCard } from '@/components/shared/link-preview';
import type { Byte } from '@/types/byte';
import type { LinkPreview } from '@/components/shared/link-preview';

/**
 * ByteCardMedia - Handles images and link previews
 * 
 * UI Spec:
 * - Images: full-width, rounded-xl, h-56 (224px), cover mode
 * - Link previews: Uses LinkPreviewCard component with provider-aware rendering
 * - Spacing: mt-3 from content
 * - Future: video support, gallery for multiple images
 */
export function ByteCardMedia({ byte }: { byte: Byte }) {
  const { media, linkPreview } = byte;
  const { tokens, spacing } = useByteCardTokens();

  // Image post
  if (media && media.length > 0) {
    return (
      <View style={{ marginTop: spacing.sm }}>
        <Image
          source={{ uri: media[0] }}
          style={{ 
            width: '100%',
            height: 224,
            borderRadius: tokens.radii.lg,
          }}
          contentFit="cover"
          transition={200}
          accessibilityLabel="Post image"
        />
      </View>
    );
  }

  // Link preview using premium LinkPreviewCard component
  if (linkPreview) {
    // Convert Byte.linkPreview to LinkPreview type
    const preview: LinkPreview = {
      url: linkPreview.url,
      title: linkPreview.title,
      description: linkPreview.description,
      image: linkPreview.image,
      favicon: linkPreview.favicon,
      siteName: linkPreview.siteName,
      provider: linkPreview.provider,
      videoId: linkPreview.videoId,
      duration: linkPreview.duration,
      tweetId: linkPreview.tweetId,
      repoStats: linkPreview.repoStats,
    };

    return (
      <View style={{ marginTop: spacing.sm }}>
        <LinkPreviewCard preview={preview} />
      </View>
    );
  }

  return null;
}

