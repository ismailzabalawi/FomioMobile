import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useByteCardTokens } from './useByteCardTokens';
import { createTextStyle } from '@/shared/design-system';
import type { Byte } from '@/types/byte';

/**
 * ByteCardMedia - Handles images and link previews
 * 
 * UI Spec:
 * - Images: full-width, rounded-xl, h-56 (224px), cover mode
 * - Link previews: border, rounded-xl, optional image header
 * - Spacing: mt-3 from content
 * - Future: video support, gallery for multiple images
 */
export function ByteCardMedia({ byte }: { byte: Byte }) {
  const { media, linkPreview } = byte;
  const { tokens, colors, spacing, borderRadius } = useByteCardTokens();

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

  // Link preview (structure defined but not fully wired yet)
  if (linkPreview) {
    const handleLinkPress = async () => {
      try {
        await WebBrowser.openBrowserAsync(linkPreview.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      } catch (error) {
        Linking.openURL(linkPreview.url).catch(() => {});
      }
    };

    return (
      <Pressable
        onPress={handleLinkPress}
        style={{
          marginTop: spacing.sm,
          borderWidth: 1,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radii.lg,
          overflow: 'hidden',
        }}
      >
        {linkPreview.image && (
          <Image
            source={{ uri: linkPreview.image }}
            style={{ 
              width: '100%',
              height: 176,
            }}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Link preview image"
          />
        )}
        <View style={{ padding: spacing.sm }}>
          <Text style={createTextStyle('body', colors.foreground)}>
            {linkPreview.title}
          </Text>
          {linkPreview.description && (
            <Text
              style={[createTextStyle('caption', colors.mutedForeground), { marginTop: spacing.xs }]}
              numberOfLines={2}
            >
              {linkPreview.description}
            </Text>
          )}
          <Text style={[createTextStyle('caption', colors.accent), { marginTop: spacing.sm }]}>
            {linkPreview.url}
          </Text>
        </View>
      </Pressable>
    );
  }

  return null;
}

